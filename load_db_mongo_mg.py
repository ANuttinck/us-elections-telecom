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
import ipdb
import copy
import ctypes


def date_print(s):
	date_tmp = datetime.datetime.now()
	print(date_tmp.strftime('%H:%M:%S') + ' ' + s)


def get_info_state(path_txt):

	state_votes = pd.read_csv(path_txt, sep=';')
	state_votes.columns = ['time', 'state', 'value']

	nb_votes = state_votes.shape[0]

	agg_state = state_votes.groupby('value').count()['time']
	nb_candidates = agg_state.shape[0]

	state_votes = None

	nb_votes_total = np.sum(agg_state.values)
	agg_state = agg_state.to_dict()

	return agg_state, nb_votes_total


def split_votes_state(state_dict, nb_split):
	
	list_state = list()
	for ii in range(nb_split):
		list_state.append(copy.deepcopy(state_dict))


	for ii in range(nb_split):
		for key, value in state_dict['dict_votes'].items():
			
			if ii == nb_split - 1:
				list_state[ii]['dict_votes'][key] = value - (nb_split - 1) * int(value / nb_split)
			
			else:
				#ipdb.set_trace()
				list_state[ii]['dict_votes'][key] = int(value / nb_split)

		list_state[ii]['split'] = str(ii + 1) + '/' + str(nb_split)
		 
	return list_state


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

	if REMOTE:
		client = MongoClient(client_connection)
	else:
		client = MongoClient()

	db = client.elections

	pipeline = [{"$group": {"_id": "$vote", "nb_votes": {"$sum": 1}}}]
	aggregations_results = []

	not_finished = True
	while not_finished:
		
		time.sleep(30)

		# test is finished
		if np.sum(np.logical_not(PROGRESS == 1.0)) == 0:
			not_finished = False

		date_print('----AGGREGATION----')
		for i_state in dict_state:
			time.sleep(1)
			state_name = i_state['state_name']
			aggregations_results.extend([{"state": IniState.loc[state_name].values[0], "vote": res['_id'], "nb_votes": res['nb_votes']} for res in list(db['res_' + state_name].aggregate(pipeline))])

		if aggregations_results == []:
			continue

		date_print('----INSERT AGGREGATED RESULTS----')
		for up_dict in aggregations_results:
			update_one_aggregation(db['agg_results'], up_dict)



def load_state(state, REF_TIME, process_id, aggregate=False):

	delay = state['minute'] * DELAY_LOADING
	state_name = state['state_name']
	time_result = state['time']
	dict_votes = state['dict_votes']

	split_num = '' if not 'split' in state.keys() else ' ' + state['split'] 

	while time.time() - REF_TIME < delay:
		time.sleep(1)
		wait = True

	date_print('{:} start loading'.format(state_name.title() + split_num))

	if REMOTE:
		client = MongoClient(client_connection)
	else:
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
		nb_iter_10_percent = np.ceil(0.1 / (nb_loading / nb_votes_total))
		i_loading = 0
		votes = db['res_' + state_name]
		ii = 0
		while i_loading < nb_votes_total:

			max_loading = int(min(nb_votes_total, i_loading + nb_loading))
			insert_dict = [func_dict(ivote) for ivote in random_votes[i_loading:max_loading]]

			i_loading = max_loading
			
			########### insert 
			status = insert_many_into_base(votes, insert_dict)
			if status == 0:
				#print('{:s}: {:d} data inserted'.format(state_name, i_loading))
				pass
			else:
				print('PROBLEM LOADING: {:} data'.format(state_name))

			PROGRESS[process_id] = float(i_loading / nb_votes_total)

			if np.mod(ii, nb_iter_10_percent) == 0:
				date_print('{:} {:.0f}% loading completed'.format(state_name.title() + split_num, PROGRESS[process_id] * 100))

			ii += 1

		date_print('{:s} loading completed, {:d} documents inserted'.format(state_name.title() + split_num, i_loading))

	else:

		votes = db.votes_agg

		insert_dict_agg = list()
		for candidate, nb_votes in dict_votes.items():
			insert_dict_agg.append({"time": time_result, "state": IniState.loc[state_name].values[0], "vote": candidate , "nb_votes": int(nb_votes)})

		########### insert 
		status = insert_many_into_base(votes, insert_dict_agg)
		
		if status == 0:
			date_print('{:} results loaded successfully'.format(state_name + split_num))
		else:
			date_print('PROBLEM LOADING {:} data'.format(state_name))
		

	client.close()


def process_filename(x):
	tmp = os.path.basename(x)
	tmp = tmp[:-4].split('_')
	return {'full_path':x, 'time': tmp[0], 'state_name':'_'.join(tmp[1:])} 


if __name__ == "__main__":

	PASSWORD = open('mongopassword.txt', 'r', encoding='utf-8').read().strip()
	IP_MASTER = '35.166.223.219:27017'
	
	settings = {
	   'host': "35.166.223.219:27017,52.26.206.44:27017,50.112.193.13:27017",
	   'database': "election",
	   'username': "teamMorpho",
	   'password': PASSWORD,
	   'options': "replicaSet=rs0"
	}
	
	client_connection = "mongodb://teamMorpho:{:}@{:}/election".format(PASSWORD, IP_MASTER)

	client_connection = "mongodb://{username}:{password}@{host}/{database}?{options}".format(**settings)

	### arguments parser
	parser = argparse.ArgumentParser()
	parser.add_argument("-g", "--aggregate", type=int, help="load aggregated results", required=True)
	parser.add_argument("-l", "--limits", type=int, nargs='+', help="begin state and end state for loading", required=True)
	parser.add_argument("-d", "--delay", type=int, help="loading delay", required=True)
	parser.add_argument("-r", "--remote", action="store_true", help="is loading remote ?")
	parser.add_argument("-i", "--ip", type=str, help="loading delay", required=False)
	args = parser.parse_args()

	begin_state, end_state = args.limits
	AGGREGATE = args.aggregate
	DELAY_LOADING = args.delay #(in second)
	REMOTE = args.remote

	IniState = pd.read_csv("mapping_initial.csv", sep=',', converters = {'Nom': lambda x: x.strip().replace(' ', '_'), 'Initial': lambda x: x.strip()})
	IniState = IniState.set_index('Nom')
	
	#PASSWORD = open("mongopassword.txt").read()

	folder_data = '../data'
	state_files = glob.glob(os.path.join(folder_data, '*'))

	state_dict = list(map(process_filename, state_files))
	state_dict = sorted(state_dict, key=lambda x: x['time'])

	# select states
	state_dict = state_dict[begin_state:end_state]

	if REMOTE:
		print('----LOADING THE REMOTE DATABASE----')

	print('Raw files analysis...')
	for ifile in state_dict:

		dict_votes, nb_votes_total = get_info_state(ifile['full_path'])
		ifile.update({'dict_votes': dict_votes, 'nb_votes_total': nb_votes_total,'minute': int(ifile['time'].split('-')[-1])})

	REF_TIME = time.time() - DELAY_LOADING * state_dict[0]['minute']


	if not AGGREGATE:

		##### split big state
		state_dict = sorted(state_dict, key=lambda x: x['nb_votes_total'])
		list_nb_votes = np.asarray(list(map(lambda x: x['nb_votes_total'], state_dict)))
		
		median_votes = np.median(list_nb_votes)
		ind_sup = np.argmax(list_nb_votes > 1.6 * np.median(list_nb_votes)) 
		nb_states = len(state_dict)

		splited_states = []
		for ind in range(ind_sup, nb_states):
			splited_states.extend(split_votes_state(state_dict[ind], int(np.ceil(list_nb_votes[ind] / median_votes)))) 
		
		state_dict = state_dict[:ind_sup]
		state_dict.extend(splited_states)

	
	### array monitor
	shared_array_base = mp.Array(ctypes.c_double, len(state_dict))
	PROGRESS = np.ctypeslib.as_array(shared_array_base.get_obj())

	#### Loading mongo base
	processes = [mp.Process(target=load_state, args=(state, REF_TIME, process_id, AGGREGATE)) for process_id, state in enumerate(state_dict)]


	if not AGGREGATE: 
		## add aggregation
		processes.append(mp.Process(target=compute_aggregations, args=(state_dict,)))
	
	# Run processes
	for p in processes:
	    p.start()

	# Exit the completed processes
	for p in processes:
	    p.join()
	




#mongo 35.166.223.219/election -u userName -p password



