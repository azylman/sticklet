import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
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
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from webob.multidict import MultiDict, UnicodeMultiDict, NestedMultiDict, NoVars

class Note(webapp.RequestHandler):
    def post(self):
        user = users.get_current_user()
        if user:
            note = stickynote.snModel(parent=stickynote.key(user.email()))
            note.author = users.get_current_user()
            note.content = ""
            note.subject = "Sticklet"
            note.color = ""
            note.trash = 0
            note.x = int ( self.request.get( 'x' ) )
            note.y = int ( self.request.get( 'y' ) )
            note.z = int ( self.request.get( 'z' ) )
            note.put()
            self.response.out.write(json.dumps(note.to_dict()))
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

    def get(self):
        user = users.get_current_user()
        if user:
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

            self.response.out.write( json.dumps( arr ) )
        else:
            self.error( 401 )
            self.response.out.write( "Not logged in." )

    def put(self):
        user = users.get_current_user()
        if user:
            dict =  json.loads ( self.request.body )
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
                    db_n.modify_date = datetime.datetime.now()
                    db_n.put()
                else:
                    self.error(400)
                    self.response.out.write ("Note for the given id does not exist.")
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

    def delete(self):
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
        else:
            self.error(401)
            self.response.out.write("Not logged in.")

class Trash(webapp.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:
            notes_query = stickynote.snModel.all().ancestor(
                stickynote.key(user.email())).order('-delete_date')
            notes_query.filter ( "trash = ", 1 )
            self.response.out.write(json.dumps([note.to_dict() for note in notes_query]))
        else:
            self.error(401)
            self.response.out.write("Not logged in.")
    def delete(self):
        user = users.get_current_user()
        if user:
            dict =  json.loads ( self.request.body )
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n.is_saved():
                    db_n.delete()
        else:
            self.error(401)
            self.response.out.write("Not logged in.")
    def put(self):
        user = users.get_current_user()
        if user:
            dict =  json.loads ( self.request.body )
            for note in dict:
                db_n = stickynote.db.get( note['id'] )
                if db_n:
                    db_n.trash = 0
                    db_n.delete_date = None
                    db_n.put()
        else:
            self.error(401)
            self.response.out.write("Not logged in.")
                    


application = webapp.WSGIApplication([
    ('/notes', Note),
    ('/notes/trash', Trash)
], debug=True)

def main():
        run_wsgi_app(application)

if __name__ == "__main__":
        main()
