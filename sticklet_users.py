from google.appengine.ext import db

class stickletUser(db.Model):
    author = db.UserProperty()
    email = db.EmailProperty()
    connections = db.ListProperty(str)
    has_shared = db.ListProperty(str)
