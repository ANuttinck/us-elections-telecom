import numpy as np
import time
import pandas as pd
from pymongo import MongoClient
import glob 
import multiprocessing as mp
import sys
import os


def get_info_state(path_txt):

	state_votes = pd.read_csv(path_txt, sep=';')
	state_votes.columns = ['time', 'state', 'value']

	time = state_votes.iloc[0]['time']
	state = state_votes.iloc[0]['state']

	nb_votes = state_votes.shape[0]

	agg_state = state_votes.groupby('value').count()['time']
	nb_candidates = agg_state.shape[0]

	state_votes = None

	return agg_state.to_dict()


def load_state(state, aggregate=False):
	
	client = MongoClient()
	db = client.elections
	
	state_name = state['state_name'].replace(' ', '_')
	time = state['time']
	dict_votes = state['dict_votes']

	nb_candidates = len(dict_votes)

	if not aggregate:

		votes = db.votes
		random_votes = np.zeros(nb_votes)
		
		i_cand = 0
		candidate_name = np.empty(nb_candidates)
		ii = 0
		for candidate, nb_votes in dict_votes.items():
			random_votes[i_cand:i_cand + nb_votes] = ii
			candidate_name[ii] = candidate
			i_cand += nb_votes
			ii += 1

		np.random.shuffle(random_votes)

		def func_dict(ivote):
			return {"time": time, "state": state_name, "vote": candidate_name[ivote]}

		nb_loading = 10000
		i_loading = 0

		while i_loading < nb_votes:
			max_loading = min(nb_votes, i_loading + nb_loading)
			insert_dict = [func_dict(ivote) for ivote in random_votes[i_loading:max_loading]]
			status_mongo = votes.insert_many(insert_dict)
			i_loading += nb_loading
			print('{:s}: {:d} data inserted'.format(state, i_loading))
	
	else:

		votes = db.votes_agg
		insert_dict_agg = list()
		for candidate, nb_votes in dict_votes.items():
			insert_dict_agg.append({"time": time, "state": IniState.loc[state_name].values[0], "vote": candidate , "nb_votes": str(nb_votes)})

		status_mongo = votes.insert_many(insert_dict_agg)

		print('{:} loaded successfully'.format(state_name))

	client.close()



def process_filename(x):
	tmp = os.path.basename(x)
	tmp = tmp[:-4].split('_')
	return {'full_path':x, 'time': tmp[0], 'state_name':' '.join(tmp[1:])} 



if __name__ == "__main__":
	
	IniState = pd.read_csv("mapping_initial.csv", sep=',', converters = {'Nom': lambda x: x.strip().replace(' ', '_'), 'Initial': lambda x: x.strip()})
	IniState = IniState.set_index('Nom')
	
	#PASSWORD = open("mongopassword.txt").read()
	AGGREGATE = True

	DELAY_LOADING = 2 #(in second)

	folder_data = '/home/matthieu/ms_bigdata/nosql/projet/data'
	state_files = glob.glob(os.path.join(folder_data, '*'))

	state_dict = list(map(process_filename, state_files))

	state_dict = sorted(state_dict, key=lambda x: x['time'])

	for ifile in state_dict:
		ifile.update({'dict_votes': get_info_state(ifile['full_path'])}, 'minute': ifile['time'].split('-')[-1])

	
	#### Loading mongo base
	processes = [mp.Process(target=load_state, args=(state, AGGREGATE)) for state in state_dict]

	nb_process = len(processes) 
	# Run processes
	for p in processes:
	    p.start()

	# Exit the completed processes
	for p in processes:
	    p.join()

	






