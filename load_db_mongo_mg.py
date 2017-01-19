#!/usr/bin/python3
import numpy as np
import time
import pandas as pd
from pymongo import MongoClient
import glob 
import multiprocessing as mp
import sys
import os
import datetime
import argparse


def get_info_state(path_txt):

	state_votes = pd.read_csv(path_txt, sep=';')
	state_votes.columns = ['time', 'state', 'value']

	nb_votes = state_votes.shape[0]

	agg_state = state_votes.groupby('value').count()['time']
	nb_candidates = agg_state.shape[0]

	state_votes = None

	return agg_state.to_dict()



def insert_many_into_base(db_collection, insert_dict):

	max_tries = 20
	i_try = 0

	while i_try < max_tries:
		status_mongo = db_collection.insert_many(insert_dict)
		i_try += 1
		if status_mongo.acknowledged:
			return 0
		else:
			time.sleep(30)
	return 1


def update_one_aggregation(db_collection, update_dict):

	max_tries = 20
	i_try = 0

	while i_try < max_tries:
		status_mongo = db_collection.update_one({key: update_dict[key] for key in ['vote', 'state']}, {"$set": {"nb_votes": update_dict['nb_votes']}}, upsert=True)
		i_try += 1
		if status_mongo.acknowledged:
			return 0
		else:
			time.sleep(30)
	return 1



def compute_aggregations(dict_state):

	client = MongoClient()
	db = client.elections

	pipeline = [{"$group": {"_id": "$vote", "nb_votes": {"$sum": 1}}}]
	aggregations_results = []

	first_iter = True
	while True:
		time.sleep(30)
		print('----AGGREGATION----')
		
		for i_state in dict_state:
			time.sleep(2)
			state_name = i_state['state_name']
			aggregations_results.extend([{"state": IniState.loc[state_name].values[0], "vote": res['_id'], "nb_votes": res['nb_votes']} for res in list(db['res_' + state_name].aggregate(pipeline))])

		if aggregations_results == []:
			continue

		'''
		if first_iter:
			insert_many_into_base(db['agg_results'], aggregations_results)
			first_iter = False
		else:
		'''	
		print('----INSERT AGGREGATED RESULTS----')
		for up_dict in aggregations_results:
			update_one_aggregation(db['agg_results'], up_dict)



def load_state(state, REF_TIME, aggregate=False):

	delay = state['minute'] * DELAY_LOADING

	state_name = state['state_name'].replace(' ', '_')
	time_result = state['time']
	dict_votes = state['dict_votes']


	while time.time() - REF_TIME < delay:
		time.sleep(1)
		wait = True

	date_tmp = datetime.datetime.now()
	print('{:}: start loading results from {:}'.format(date_tmp.strftime('%H:%M:%S'), state_name))

	client = MongoClient()
	db = client.elections
	
	nb_candidates = len(dict_votes)

	if not aggregate:

		nb_votes_total = 0
		for kk in dict_votes:
			nb_votes_total += dict_votes[kk]

		random_votes = np.zeros(nb_votes_total, dtype=int)
		
		i_cand = 0
		candidate_name = []
		ii = 0
		for candidate, nb_votes in dict_votes.items():
			random_votes[i_cand:i_cand + nb_votes] = ii
			candidate_name.append(candidate)
			i_cand += nb_votes
			ii += 1

		np.random.shuffle(random_votes)
		candidate_name = np.asarray(candidate_name)

		def func_dict(ivote):
			return {"time": time_result, "state": IniState.loc[state_name].values[0], "vote": candidate_name[ivote]}


		nb_loading = 100000
		i_loading = 0
		votes = db['res_' + state_name]

		while i_loading < nb_votes_total:

			max_loading = int(min(nb_votes_total, i_loading + nb_loading))
			insert_dict = [func_dict(ivote) for ivote in random_votes[i_loading:max_loading]]

			i_loading = max_loading
			########### insert 
			status = insert_many_into_base(votes, insert_dict)
			if status == 0:
				#print('{:s}: {:d} data inserted'.format(state_name, i_loading))
				ok = True
			else:
				print('PROBLEM LOADING: {:} data'.format(state_name))

		print('{:s}: loading completed, {:d} documents inserted'.format(state_name.title(), i_loading))

	else:

		votes = db.votes_agg

		insert_dict_agg = list()
		for candidate, nb_votes in dict_votes.items():
			insert_dict_agg.append({"time": time_result, "state": IniState.loc[state_name].values[0], "vote": candidate , "nb_votes": int(nb_votes)})

		########### insert 
		status = insert_many_into_base(votes, insert_dict_agg)
		
		if status == 0:
			print('{:}: results loaded successfully'.format(state_name))
		else:
			print('PROBLEM LOADING: {:} data'.format(state_name))
		

	client.close()



def process_filename(x):
	tmp = os.path.basename(x)
	tmp = tmp[:-4].split('_')
	return {'full_path':x, 'time': tmp[0], 'state_name':' '.join(tmp[1:])} 



if __name__ == "__main__":


	### arguments parser
	parser = argparse.ArgumentParser()
	parser.add_argument("-g", "--aggregate", type=int, help="load aggregated results", required=True)
	parser.add_argument("-l", "--limits", type=int, nargs='+', help="begin state and end state for loading", required=True)
	parser.add_argument("-d", "--delay", type=int, help="loading delay", required=True)
	args = parser.parse_args()

	begin_state, end_state = args.limits
	AGGREGATE = args.aggregate
	DELAY_LOADING = args.delay #(in second)

	IniState = pd.read_csv("mapping_initial.csv", sep=',', converters = {'Nom': lambda x: x.strip().replace(' ', '_'), 'Initial': lambda x: x.strip()})
	IniState = IniState.set_index('Nom')
	
	#PASSWORD = open("mongopassword.txt").read()

	folder_data = '/home/matthieu/ms_bigdata/nosql/projet/data'
	state_files = glob.glob(os.path.join(folder_data, '*'))

	state_dict = list(map(process_filename, state_files))
	state_dict = sorted(state_dict, key=lambda x: x['time'])

	# select states
	state_dict = state_dict[begin_state:end_state]

	print('Raw files analysis...')
	for ifile in state_dict:
		ifile.update({'dict_votes': get_info_state(ifile['full_path']), 'minute': int(ifile['time'].split('-')[-1])})

	REF_TIME = time.time() - DELAY_LOADING * state_dict[begin_state]['minute']
	
	#### Loading mongo base
	processes = [mp.Process(target=load_state, args=(state, REF_TIME, AGGREGATE)) for state in state_dict]

	if not AGGREGATE: 
		## add aggregation
		processes.append(mp.Process(target=compute_aggregations, args=(state_dict,)))
	
	# Run processes
	for p in processes:
	    p.start()

	# Exit the completed processes
	for p in processes:
	    p.join()
	






