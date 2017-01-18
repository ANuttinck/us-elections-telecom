import numpy as np
import time
import pandas as pd
from pymongo import MongoClient
import glob 
import multiprocessing as mp
import sys


def load_state(path_txt):
	
	client = MongoClient()
	db = client.elections
	
	
	state_votes = pd.read_csv(path_txt, ';')
	state_votes.columns = ['time', 'state', 'value']

	time = state_votes.iloc[0]['time']
	state = state_votes.iloc[0]['state']

	votes = db.votes

	nb_votes = state_votes.shape[0]

	agg_state = state_votes.groupby('value').count()['time']
	nb_candidates = agg_state.shape[0]

	state_votes = None

	random_votes = np.zeros(nb_votes)
	i_cand = 0
	for ii in range(nb_candidates):
		random_votes[i_cand:i_cand + agg_state.values[ii]] = ii
		i_cand += agg_state.values[ii]

	np.random.shuffle(random_votes)

	def func_dict(ivote):
		return {"time": time, "state": state, "vote": agg_state.index[ivote]}

	nb_loading = 10000
	i_loading = 0

	while i_loading < nb_votes:
		max_loading = min(nb_votes, i_loading + nb_loading)
		insert_dict = [func_dict(ivote) for ivote in random_votes[i_loading:max_loading]]
		votes.insert_many(insert_dict)
		i_loading += nb_loading
		print('{:s}: {:d} data inserted'.format(state, i_loading))

	client.close()
	#print(300 * '', end='\r')
	#print('{:s} loading completed'.format(state))



if __name__ == "__main__":

	state_files = glob.glob('data/*')

	#state_files = state_files[:2]

	processes = [mp.Process(target=load_state, args=(file, )) for file in state_files]

	nb_process = len(processes) 
	
	# Run processes
	for p in processes:
	    p.start()

	# Exit the completed processes
	for p in processes:
	    p.join()

	






