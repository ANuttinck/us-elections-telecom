from flask import Flask
from flask import render_template
from pymongo import MongoClient
import json
from bson import json_util
from bson.json_util import dumps

app = Flask(__name__)

DBS_NAME = 'election'
COLLECTION_NAME = 'votes'
PASSWORD = open("mongopassword.txt").read()
LOGIN = "teamMorpho"

settings = {
    'host': "35.162.205.246:27017,35.167.58.61:27017,35.165.27.40:27017",
    'database': DBS_NAME,
    'username': LOGIN,
    'password': PASSWORD,
    'options': "replicaSet=rs0"
}

FIELDS = {'time': True,
          'vote': True,
          'nb_votes': True,
          'state': True,
          '_id': False}

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/election/votes")
def donorschoose_projects():
    connection = MongoClient("mongodb://{username}:{password}@{host}/{database}?{options}".format(**settings))
    collection = connection[DBS_NAME][COLLECTION_NAME]
    votes = collection.find(projection=FIELDS, limit=100000)
    json_votes = []
    for vote in votes:
        json_votes.append(vote)
    json_votes = json.dumps(json_votes, default=json_util.default)
    connection.close()
    return json_votes

if __name__ == "__main__":
    app.run(host='0.0.0.0',port=5000,debug=True)
