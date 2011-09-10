import os
from google.appengine.dist import use_library
use_library('django', '1.2')

import cgi
import wsgiref.handlers

from google.appengine.api import users
from google.appengine.api import channel
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

class MainPage(webapp.RequestHandler):
    def get(self):

        user = users.get_current_user()
        if user:
            url = users.create_logout_url("/greeting")
            url_linktext = 'Logout'
            #token = channel.create_channel( user.user_id() + "_channel" );
            template_values = {
                #'token' : token,
                'url': url,
                'url_linktext': url_linktext,
                'user' : user.nickname(),
                'color1' : "#F7977A",
                'color2' : "#C5E3BF",
                'color3' : "#c1F0F6",
                'color4' : "#FFF79A",
                'color5' : "#FDC68A",
                'color6' : "#D8BFD8"
            }

            path = os.path.join(os.path.dirname(__file__), 'index.html')
            self.response.out.write(template.render(path, template_values))
        else:
            self.redirect("/greeting")

class Greeting(webapp.RequestHandler):
    def get(self):
        url = users.create_login_url('/')
        url_linktext = "Log In"
        template_values = {
            'url': url,
            'url_linktext': url_linktext,
            }
        
        path = os.path.join(os.path.dirname(__file__), 'greeting.html')
        self.response.out.write(template.render(path, template_values))
            
application = webapp.WSGIApplication([
        ('/', MainPage),
        ('/greeting', Greeting)
], debug=True)

def main():
        run_wsgi_app(application)

if __name__ == "__main__":
        main()
