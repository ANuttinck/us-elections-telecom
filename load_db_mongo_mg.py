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
			return {"time": time_result, "state": state_name, "vote": candidate_name[ivote]}


		nb_loading = 50000
		i_loading = 0
		votes = db.votes

		while i_loading < nb_votes_total:

			max_loading = int(min(nb_votes_total, i_loading + nb_loading))

			insert_dict = [func_dict(ivote) for ivote in random_votes[i_loading:max_loading]]
			status_mongo = votes.insert_many(insert_dict)
			i_loading = max_loading

			print('{:s}: {:d} data inserted'.format(state_name, i_loading))
	
	else:

		votes = db.votes_agg
		insert_dict_agg = list()
		for candidate, nb_votes in dict_votes.items():
			insert_dict_agg.append({"time": time_result, "state": IniState.loc[state_name].values[0], "vote": candidate , "nb_votes": str(nb_votes)})

		insert_status = False
		while not insert_status:
			
			status_mongo = votes.insert_many(insert_dict_agg)

			if status_mongo.acknowledged:
				print('{:} loaded successfully'.format(state_name))
				insert_status = True
			else:
				time.sleep(30)
		

	client.close()



def process_filename(x):
	tmp = os.path.basename(x)
	tmp = tmp[:-4].split('_')
	return {'full_path':x, 'time': tmp[0], 'state_name':' '.join(tmp[1:])} 



if __name__ == "__main__":

	### arguments parser
	parser = argparse.ArgumentParser()
	parser.add_argument("-g", "--aggregate", type=bool, help="load aggregated results", required=True)
	parser.add_argument("-l", "--limits", type=int, nargs='+', help="begin state and end state for loading", required=True)
	args = parser.parse_args()

	begin_state, end_state = args.limits
	AGGREGATE = args.aggregate
	
	IniState = pd.read_csv("mapping_initial.csv", sep=',', converters = {'Nom': lambda x: x.strip().replace(' ', '_'), 'Initial': lambda x: x.strip()})
	IniState = IniState.set_index('Nom')
	
	#PASSWORD = open("mongopassword.txt").read()
	
	DELAY_LOADING = 10 #(in second)

	folder_data = '/home/matthieu/ms_bigdata/nosql/projet/data'
	state_files = glob.glob(os.path.join(folder_data, '*'))

	state_dict = list(map(process_filename, state_files))
	state_dict = sorted(state_dict, key=lambda x: x['time'])

	state_dict = state_dict[begin_state:end_state]
	for ifile in state_dict:
		ifile.update({'dict_votes': get_info_state(ifile['full_path']), 'minute': int(ifile['time'].split('-')[-1])})

	REF_TIME = time.time() - DELAY_LOADING * state_dict[begin_state]['minute']
	#### Loading mongo base
	processes = [mp.Process(target=load_state, args=(state, REF_TIME, AGGREGATE)) for state in state_dict]

	nb_process = len(processes) 
	# Run processes
	for p in processes:
	    p.start()

	# Exit the completed processes
	for p in processes:
	    p.join()

	






