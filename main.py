import cgi
import datetime
import os
import urllib
import wsgiref.handlers
from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

class StickyNote(db.Model):
	"""Models an individual Guestbook entry with an author, content, and date."""
	author = db.UserProperty()
	content = db.StringProperty(multiline=True)
	date = db.DateTimeProperty(auto_now_add=True)
	subject = db.StringProperty()

def notepage_key(email):
	"""Constructs a datastore key for a Guestbook entity with guestbook_name."""
	return db.Key.from_path('StickyNote', email)

class MainPage(webapp.RequestHandler):
	def get(self):

		user = users.get_current_user()
		if user:
			url = users.create_logout_url(self.request.uri)
			url_linktext = 'Logout'

			greetings_query = StickyNote.all().ancestor(
				notepage_key(user.email())).order('-date')
			greetings = greetings_query.fetch(10)

			template_values = {
				'greetings': greetings,
				'url': url,
				'url_linktext': url_linktext,
			}

			path = os.path.join(os.path.dirname(__file__), 'index.html')
			self.response.out.write(template.render(path, template_values))
		else:
			self.redirect(users.create_login_url(self.request.uri))

class Guestbook(webapp.RequestHandler):
	def post(self):
		# We set the same parent key on the 'StickyNote' to ensure each greeting is in
		# the same entity group. Queries across the single entity group will be
		# consistent. However, the write rate to a single entity group should
		# be limited to ~1/second.

		user = users.get_current_user()
		if user:
			greeting = StickyNote(parent=notepage_key(user.email()))
			greeting.author = users.get_current_user()
			greeting.content = self.request.get('content')
			if len(greeting.content) > 3:
				greeting.subject = greeting.content[:4]
			else:
				greeting.subject = greeting.content

			greeting.put()
		self.redirect('/')

application = webapp.WSGIApplication([
	('/', MainPage),
	('/sign', Guestbook)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
