from flask import Flask
from flask import render_template
from pymongo import MongoClient
import json
from bson import json_util
from bson.json_util import dumps

app = Flask(__name__)

MONGODB_HOST = '35.166.223.219/election'
MONGODB_PORT = 27017
DBS_NAME = 'election'
COLLECTION_NAME = 'votes'
#FIELDS = {'school_state': True,
 #         'resource_type': True,
  #        'poverty_level': True,
   #       'date_posted': True,
	#      'total_donations': True,
     #     '_id': False}

FIELDS = {'time': True,
          'vote': True,
          'nb_votes': True,
          'state': True,
          '_id': False}

PASSWORD = open("mongopassword.txt").read()
LOGIN = "teamMorpho"

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/election/votes")
def donorschoose_projects():

    connection = MongoClient("mongodb://" + LOGIN + ":" + PASSWORD + "@" + MONGODB_HOST)
    #connection = MongoClient()
    print()
    collection = connection[DBS_NAME][COLLECTION_NAME]
    votes = collection.find(projection=FIELDS, limit=100000)
    #projects = collection.find(projection=FIELDS)
    json_votes = []
    for vote in votes:
        json_votes.append(vote)
    json_votes = json.dumps(json_votes, default=json_util.default)
    connection.close()
    return json_votes

if __name__ == "__main__":
    app.run(host='0.0.0.0',port=5000,debug=True)
