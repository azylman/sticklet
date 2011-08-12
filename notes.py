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
			note.content = self.request.get('content')
			if note.content == "":
				note.content = "Content here"
				note.subject = "Subject"
			note.color = "#FF00FF"
			note.trash = 0
			note.x = int ( self.request.get( 'x' ) )
			note.y = int ( self.request.get( 'y' ) )
			note.z = 0
			note.put()
			self.response.out.write(json.dumps(note.to_dict()))

	def get(self):
		user = users.get_current_user()
		if user:
			notes_query = stickynote.snModel.all().ancestor(
				stickynote.key(user.email())).order('-date')
			notes_query.filter ( "trash = ", 0 )
			self.response.out.write(json.dumps([note.to_dict() for note in notes_query]))

	def put(self, id):
		user = users.get_current_user()
		if user:
			fs = cgi.FieldStorage()
			vars = MultiDict.from_fieldstorage(fs)
			note = stickynote.db.get( id )
			if note:
				content = vars.get( 'content' )
				subject = vars.get( 'subject' )
				color = vars.get( 'color' )
				trash = vars.get( 'trash' )
				x = vars.get( 'x' )
				y = vars.get( 'y' )
				z = vars.get( 'z' )
				if content:
					note.content = content
				if subject:
					note.subject = subject
				if x:
					note.x = int(x)
				if y:
					note.y = int(y)
				if z:
					note.z = int(z)
				if color:
					note.color = color
				if trash:
					note.trash = trash
				note.put()
				self.response.out.write ( "true" );
			else:
				self.response.out.write ("no id found")

application = webapp.WSGIApplication([
	('/notes', Note),
	('/notes/(.*)', Note)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
