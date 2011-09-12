import os
from google.appengine.dist import use_library
use_library('django', '1.2')

import logging
import cgi
import datetime
import sys
import wsgiref.handlers
import urlparse

import stickynote
import sticklet_users

from django.utils import simplejson as json

from google.appengine.api import users
from google.appengine.api import memcache
from google.appengine.api import channel
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from webob.multidict import MultiDict, UnicodeMultiDict, NestedMultiDict, NoVars

class Note(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        up = sticklet_users.stickletUser.get_by_key_name( user.user_id() )
        if user:
            note = stickynote.snModel(parent=stickynote.key(user.email()))
            note.author = user
            note.content = ""
            note.subject = "Sticklet"
            note.color = ""
            note.trash = 0
            note.is_list = 0
            note.x = int ( self.request.get( 'x' ) )
            note.y = int ( self.request.get( 'y' ) )
            note.z = int ( self.request.get( 'z' ) )
            note.put()
            self.response.out.write(json.dumps(note.to_dict()))
            memcache.delete( user.user_id() + "_notes" )
            sentTo( json.dumps( [note.to_dict()] ), user, self.request.get( 'from' ) )
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

    def get(self):
        user = users.get_current_user()
        if user:
            note_query = memcache.get( user.user_id() + "_notes")
            if note_query is not None:
                self.response.out.write( note_query )
            else:
                notes_query = stickynote.snModel.all().ancestor(
                    stickynote.key(user.email()))
                notes_query.filter ( "trash = ", 0 ).order('z')
                
                min_z = 0
                arr = []
                for note in notes_query:
                    note.z = min_z
                    note.put()
                    arr.append ( note.to_dict() )
                    min_z = min_z + 1

                u = sticklet_users.stickletUser.get_by_key_name( user.user_id() )
                if u:
                    for nos in u.has_shared:
                        note = stickynote.db.get( nos )
                        arr.append( note.to_dict() )
                        # if note:
                        #     if u.author.user_id() in note.shared_with:
                        #         arr.append( note.to_dict() )
                # do something about z-indexes here

                notes = json.dumps( arr )
                self.response.out.write( notes )
                memcache.add( user.user_id() + "_notes", notes )

        else:
            self.error( 401 )
            self.response.out.write( "Not logged in." )

    def put(self):
        user = users.get_current_user()
        if user:
            dict =  json.loads ( self.request.body )
            cur = ""
            notes = []
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    if 'content' in note:
                        db_n.content = note['content']
                    if 'subject' in note:
                        db_n.subject = note['subject']
                    if 'color' in note:
                        db_n.color = note['color']
                    if 'x' in note:
                        db_n.x = int(note['x'])
                    if 'y' in note:
                        db_n.y = int(note['y'])
                    if 'z' in note:
                        db_n.z = int(note['z'])
                    if 'is_list' in note:
                        db_n.is_list = int(note['is_list'])
                    cur = note['from']    
                    db_n.modify_date = datetime.datetime.now()
                    notes.append ( db_n.to_dict() )
                    db_n.put()
                    
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
    def get(self):
        user = users.get_current_user()
        if user:

            note_query = memcache.get( user.user_id() + "_trash")
            if note_query is not None:
                self.response.out.write( note_query )
            else:
                notes_query = stickynote.snModel.all().ancestor(
                    stickynote.key(user.email()))
                notes_query.filter ( "trash = ", 1 ).order('delete_date')

                arr = []
                for note in notes_query:
                    arr.append( note.to_dict() )

                trash = json.dumps( arr )
                self.response.out.write( trash )
                memcache.add( user.user_id() + "_trash", trash )

        else:
            self.error(401)
            self.response.out.write("Not logged in.")
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
                    db_n.trash = 0
                    db_n.delete_date = None
                    db_n.put()
                    notes.append( db_n.to_dict() )

            sentTo( json.dumps( notes ), user, cur )
            memcache.delete( user.user_id() + "_notes")
            memcache.delete( user.user_id() + "_trash")
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

class Connect(webapp.RequestHandler):
    def post(self):
        client_id = self.request.get("from")
        #get current user isn't working...
        u_id = client_id.rpartition("-")[2].partition("_")[0]
        c_u = sticklet_users.stickletUser.get_or_insert( u_id )
        c_u.connections.append( client_id )
        c_u.put()

class Disconnect(webapp.RequestHandler):
    def post(self):
        client_id = self.request.get("from")
        #get current user isn't working...
        u_id = client_id.rpartition("-")[2].partition("_")[0]
        c_u = sticklet_users.stickletUser.get_or_insert( u_id )
        c_u.connections.remove( client_id )
        c_u.put()

class Share(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        mail = json.loads ( self.request.body )
        if user:
            up = sticklet_users.stickletUser.get_by_key_name( user.user_id() )
            if up:
                add = sticklet_users.stickletUser.all()
                add = add.filter( "email =", mail['email'] ).get()
                if add:
                    db_n = stickynote.db.get( mail['id'] )
                    add.has_shared.append( mail['id'] )
                    if db_n:
                        db_n.shared_with.append( user.user_id() )
                        db_n.put()
                    add.put()
                self.response.out.write(mail['email'])
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

def sentTo( msg, user, cur ):
    up = sticklet_users.stickletUser.get_by_key_name( user.user_id() )
    if up:
        for con in up.connections:
            if con != cur:
                channel.send_message( con, msg )
    if up.author is None:
        up.author = user
        up.email = user.email()
        up.put()

application = webapp.WSGIApplication([
    ('/notes', Note),
    ('/notes/trash', Trash),
    ('/_ah/channel/connected/', Connect),
    ('/_ah/channel/disconnected/', Disconnect),
    ('/share', Share) ], debug=True)

def main():
        run_wsgi_app(application)

if __name__ == "__main__":
        main()
