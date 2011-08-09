import cgi
import os
import wsgiref.handlers

import stickynote

from google.appengine.api import users
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

application = webapp.WSGIApplication([
	('/', MainPage)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
