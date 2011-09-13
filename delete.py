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
            notes = []
            cur = ""
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    cur = note['from']
                    db_n.trash = 1
                    db_n.delete_date = datetime.datetime.now()
                    db_n.put();
                    notes.append( db_n.to_dict() )
                else:
                    self.error(400)
                    self.response.out.write ("Note for the given id does not exist.")
            sentTo( json.dumps( notes ), user, cur )
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
            notes = []
            cur = ""
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    if db_n.is_saved():
                        cur = note['from']
                        db_n.delete()
                        notes.append( {"to_delete":note['id']} )
            sentTo( json.dumps( notes ), user, cur )
            memcache.delete( user.user_id() + "_trash")
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

def sentTo( msg, user, cur ):
    #up = memcache.get( user.user_id() + "_user")
    #if up is None:
    up = sticklet_users.stickletUser.get_by_key_name( user.user_id() )
        #memcache.add( user.user_id() + "_user", up )
    if up:
        cur = user.user_id() + "_chan_" + cur
        for con in up.connections:
            if con != cur:
                channel.send_message( con, msg )

    if up.author is None:
        up.author = user
        up.email = string.lower(user.email())
        up.put()
        #memcache.delete( user.user_id() + "_user" );
        #memcache.add( user.user_id() + "_user", up )

application = webapp.WSGIApplication([
    ('/notes/delete', Note),
    ('/notes/trash/delete', Trash) ], debug=True)

def main():
        run_wsgi_app(application)

if __name__ == "__main__":
        main()
