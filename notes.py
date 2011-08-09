import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
from google.appengine.dist import use_library
use_library('django', '1.2')

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
			if len(note.content) > 3:
				note.subject = note.content[:4]
			else:
				note.subject = note.content
			note.x = 0.0
			note.y = 0.0
			note.z = 0

			note.put()
		self.redirect('/')

	def get(self):
		user = users.get_current_user()
		if user:
			notes_query = stickynote.snModel.all().ancestor(
				stickynote.key(user.email())).order('-date')
			self.response.out.write(json.dumps([note.to_dict() for note in notes_query]))

application = webapp.WSGIApplication([
	('/notes', Note)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
