import os
from google.appengine.dist import use_library
use_library('django', '1.2')

import logging
import cgi
import datetime
import sys
import wsgiref.handlers
import urlparse
import sticklet_users
import string

import stickynote
import notes

from django.utils import simplejson as json

from google.appengine.api import users
from google.appengine.api import memcache
from google.appengine.api import channel
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class Note(webapp.RequestHandler):
    def put(self):
        user = users.get_current_user()
        if user:
            dict =  json.loads ( self.request.body )
            snotes = []
            cur = ""
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    cur = note['from']
                    db_n.trash = 1
                    db_n.delete_date = datetime.datetime.now()
                    db_n.put();
                    snotes.append( db_n.to_dict() )
                else:
                    self.error(400)
                    self.response.out.write ("Note for the given id does not exist.")
            notes.sentTo( json.dumps( snotes ), user, cur )
            memcache.delete( user.user_id() + "_notes")
            memcache.delete( user.user_id() + "_trash")
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

class Trash(webapp.RequestHandler):
    def put(self):
        user = users.get_current_user()
        if user:
            dict =  json.loads ( self.request.body )
            snotes = []
            cur = ""
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    if db_n.is_saved():
                        cur = note['from']
                        db_n.delete()
                        snotes.append( {"to_delete":note['id']} )
            notes.sentTo( json.dumps( snotes ), user, cur )
            memcache.delete( user.user_id() + "_trash")
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

application = webapp.WSGIApplication([
    ('/notes/delete', Note),
    ('/notes/trash/delete', Trash) ], debug=True)

def main():
        run_wsgi_app(application)

if __name__ == "__main__":
        main()
