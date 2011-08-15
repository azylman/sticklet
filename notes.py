import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
from google.appengine.dist import use_library
use_library('django', '1.2')

import logging
import cgi
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
			note.subject = "Note"
			note.color = ""
			note.trash = 0
			note.x = int ( self.request.get( 'x' ) )
			note.y = int ( self.request.get( 'y' ) )
			note.z = int ( self.request.get( 'z' ) )
			note.put()
			self.response.out.write(json.dumps(note.to_dict()))

	def get(self):
		user = users.get_current_user()
		if user:
			notes_query = stickynote.snModel.all().ancestor(
				stickynote.key(user.email())).order('-date')
			notes_query.filter ( "trash = ", 0 )
			self.response.out.write(json.dumps([note.to_dict() for note in notes_query]))

	def put(self):
		user = users.get_current_user()
		if user:
			#fs = cgi.FieldStorage()
			#vars = MultiDict.from_fieldstorage(fs)
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
					if 'trash' in note:
						db_n.trash = note['trash']
					if 'x' in note:
						db_n.x = int(note['x'])
					if 'y' in note:
						db_n.y = int(note['y'])
					if 'z' in note:
						db_n.z = int(note['z'])
					db_n.put()
				else:
					self.response.out.write ("Problem retrieving data from server.  Contact webmanager.")
			self.response.out.write( "true" )

application = webapp.WSGIApplication([
	('/notes', Note)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
