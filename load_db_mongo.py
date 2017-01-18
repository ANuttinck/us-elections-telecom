import numpy as np
import time
import pandas as pd
from pymongo import MongoClient
import glob 
import multiprocessing as mp
import sys

IniState = pd.read_excel("mapping_initial.xlsx")
IniState["Nom"] = list(map(lambda x:x[:-1], IniState["Nom"]))
IniState["Initial"] = list(map(lambda x:x[:-1], IniState["Initial"]))

PASSWORD = open("mongopassword.txt").read()

def load_state(path_txt):
	
	client = MongoClient("mongodb://teamMorpho:" + PASSWORD + "@35.164.135.148/election")
	db = client.election


	state_votes = pd.read_csv(path_txt, ';')
	state_votes.columns = ['time', 'state', 'value']

	time = state_votes.iloc[0]['time']
	state = state_votes.iloc[0]['state'].replace('_', ' ')
	votes = db.votes

	nb_votes = state_votes.shape[0]

	agg_state = state_votes.groupby('value').count()['time']
	nb_candidates = agg_state.shape[0]

	
	def func_dict(ivote):
		return {"time": time, "state": IniState[IniState["Nom"] == state]["Initial"].values[0], "vote": agg_state.index[ivote] , "nb_votes": str(agg_state.values[ivote])}

	insert_dict = [func_dict(ivote) for ivote in range(agg_state.shape[0])]
	votes.insert_many(insert_dict)
	print(str(IniState[IniState["Nom"] == state]["Initial"].values[0]) + ' - {:s}: data inserted'.format(state))

	client.close()



if __name__ == "__main__":

	state_files = glob.glob('data/*')

	processes = [mp.Process(target=load_state, args=(file, )) for file in state_files]

	nb_process = len(processes) 
	
	# Run processes
	for p in processes:
	    p.start()

	# Exit the completed processes
	for p in processes:
	    p.join()

	






