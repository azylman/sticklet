from google.appengine.ext import db

class snModel(db.Model):
	"""Models an individual Guestbook entry with an author, content, and date."""
	author = db.UserProperty()
	content = db.StringProperty(multiline=True)
	date = db.DateTimeProperty(auto_now_add=True)
	subject = db.StringProperty()
	x = db.FloatProperty()
	y = db.FloatProperty()
	z = db.IntegerProperty()

def key(email):
	"""Constructs a datastore key for a Guestbook entity with guestbook_name."""
	return db.Key.from_path('StickyNote', email)
