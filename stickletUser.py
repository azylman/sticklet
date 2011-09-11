from google.appengine.ext import db

class stickletUser(db.Model):
    connections = db.ListProperty(str)
    has_shared = db.ListProperty(str)

