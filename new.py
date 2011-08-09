import cgi
import wsgiref.handlers

import stickynote

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

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
	('/new', Note)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
