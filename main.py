import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
from google.appengine.dist import use_library
use_library('django', '1.2')

import cgi
import wsgiref.handlers

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
			

			template_values = {
				'url': url,
				'url_linktext': url_linktext,
				'user' : user.nickname()
			}

			path = os.path.join(os.path.dirname(__file__), 'index.html')
			self.response.out.write(template.render(path, template_values))
		else:
			#self.redirect(users.create_login_url(self.request.uri))
			self.redirect("/greet")

class GreetingPage(webapp.RequestHandler):
	def get(self):
		self.response.out.write("<h1>Greeting page here</h1>")
		url = users.create_login_url('/')
		self.response.out.write("<a href='" + url + "'>Log In</a>")

application = webapp.WSGIApplication([
	('/', MainPage),
	('/greet', GreetingPage)
], debug=True)

def main():
		run_wsgi_app(application)

if __name__ == "__main__":
		main()
