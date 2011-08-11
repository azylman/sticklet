import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
from google.appengine.dist import use_library
use_library('django', '1.2')

import logging
import cgi
import wsgiref.handlers

import stickynote

from django.utils import simplejson as json

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class Note(webapp.RequestHandler):
	def post(self):
		user = users.get_current_user()
		if user:
			note = stickynote.snModel(parent=stickynote.key(user.email()))
			note.author = users.get_current_user()
			note.content = self.request.get('content')
			if note.content == "":
				note.content = "Content here"
				note.subject = "Subject"
			note.x = int ( self.request.get( 'x' ) )
			note.y = int ( self.request.get( 'y' ) )
			note.z = 0
			note.put()
			self.response.out.write(json.dumps(note.to_dict()))
		#self.redirect('/')

	def get(self):
		user = users.get_current_user()
		if user:
			notes_query = stickynote.snModel.all().ancestor(
				stickynote.key(user.email())).order('-date')
			self.response.out.write(json.dumps([note.to_dict() for note in notes_query]))

class uNote(webapp.RequestHandler):
	def post(self):
		user = users.get_current_user()
		if user:
			logging.critical("ID: " + self.request.get('id'))
			note = stickynote.db.get( self.request.get('id') )
			if note:
				content = self.request.get( 'content' )
				if content:
					note.content = content
				else:
					note.x = int(self.request.get('x'))
					note.y = int(self.request.get('y'))
					note.z = int(self.request.get('z'))
				note.put()
				self.response.out.write ( "true" );
			else:
				self.response.out.write ("no id found")

	def put(self):
		user = users.get_current_user()
		if user:
			logging.critical("ID: " + self.request.get('id'))
			note = stickynote.db.get( self.request.get('id') )
			if note:
				content = self.request.get( 'content' )
				if content:
					note.content = content
				else:
					note.x = int(self.request.get('x'))
					note.y = int(self.request.get('y'))
					note.z = int(self.request.get('z'))
				note.put()
				self.response.out.write ( "true" );
			else:
				self.response.out.write ("no id found")

application = webapp.WSGIApplication([
	('/notes', Note),
	('/note', uNote)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
