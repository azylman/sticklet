import cgi
import datetime
import os
import urllib
import wsgiref.handlers

import stickynote

from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

class MainPage(webapp.RequestHandler):
	def get(self):

		user = users.get_current_user()
		if user:
			url = users.create_logout_url(self.request.uri)
			url_linktext = 'Logout'

			notes_query = stickynote.snModel.all().ancestor(
				stickynote.key(user.email())).order('-date')
			notes = notes_query.fetch(10)

			template_values = {
				'notes': notes,
				'url': url,
				'url_linktext': url_linktext,
			}

			path = os.path.join(os.path.dirname(__file__), 'index.html')
			self.response.out.write(template.render(path, template_values))
		else:
			self.redirect(users.create_login_url(self.request.uri))

class Note(webapp.RequestHandler):
	def post(self):
		# We set the same parent key on the 'StickyNote' to ensure each greeting is in
		# the same entity group. Queries across the single entity group will be
		# consistent. However, the write rate to a single entity group should
		# be limited to ~1/second.

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

application = webapp.WSGIApplication([
	('/', MainPage),
	('/sign', Note)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
