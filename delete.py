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
            cur = ""
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    cur = note['from']
                    db_n.trash = 1
                    db_n.delete_date = datetime.datetime.now()
                    db_n.put();
                    if user.user_id() == db_n.author.user_id():
                        susers = [user.user_id()]
                    else:
                        susers = [user.user_id(), db_n.author.user_id()]                    
                    for u in db_n.shared_with:
                        susers.append( u )
                    notes.sentTo( json.dumps( [db_n.to_dict()] ), susers, cur )
                else:
                    self.error(400)
                    self.response.out.write ("Note for the given id does not exist.")
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
            cur = ""
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    if db_n.is_saved():
                        cur = note['from']

                        if user.user_id() == db_n.author.user_id():
                            susers = []
                            for u in db_n.shared_with:
                                s = sticklet_users.stickletUser.get_by_key_name( u )
                                if note.['id'] in s.has_shared:
                                    s.has_shared.remove( note['id'] )
                                susers.append( u )
                            if user.user_id() not in susers:
                                susers.append( user.user_id() )
                            db_n.delete()
                        else:
                            susers = [user.user_id()]
                            if user.user_id() in db_n.shared_with:
                                db_n.shared_with.remove( user.user_id() )
                                db_n.put()
                            c_u = memcache.get( user.user_id() + "_user" )
                            if c_u is None:
                                c_u = notes.sticklet_users.stickletUser.get( user.user_id() )
                            if note['id'] in c_u.has_shared:
                                c_u.has_shared.remove( note['id'] )
                                c_u.put()
                                memcache.set( user.user_id() + "_user", c_u )

                        notes.sentTo( json.dumps( [{"to_delete":note['id']}] ), susers, cur )

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
