import os
#os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
from google.appengine.dist import use_library
use_library('django', '1.2')

import logging
import cgi
import datetime
import sys
import wsgiref.handlers
import urlparse

import stickynote

from django.utils import simplejson as json

from google.appengine.api import users
from google.appengine.api import memcache
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class Note(webapp.RequestHandler):
    def put(self):
        user = users.get_current_user()
        if user:
            dict =  json.loads ( self.request.body )
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    db_n.trash = 1
                    db_n.delete_date = datetime.datetime.now()
                    db_n.put();
                else:
                    self.error(400)
                    self.response.out.write ("Note for the given id does not exist.")
            memcache.flush_all()
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

class Trash(webapp.RequestHandler):
    def put(self):
        user = users.get_current_user()
        if user:
            dict =  json.loads ( self.request.body )
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    if db_n.is_saved():
                        db_n.delete()
            memcache.delete("trash")
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

application = webapp.WSGIApplication([
    ('/notes/delete', Note),
    ('/notes/trash/delete', Trash)
], debug=True)

def main():
        run_wsgi_app(application)

if __name__ == "__main__":
        main()
