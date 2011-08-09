from google.appengine.ext import db

class StickyNoteModel(db.Model):
	"""Models an individual Guestbook entry with an author, content, and date."""
	author = db.UserProperty()
	content = db.StringProperty(multiline=True)
	date = db.DateTimeProperty(auto_now_add=True)
	subject = db.StringProperty()
	x = db.FloatProperty()
	y = db.FloatProperty()
	z = db.IntegerProperty()

class snModel(StickyNoteModel):
	def to_dict(self):
		#return dict([(p, unicode(getattr(self, p))) for p in self.properties()])
		return dict({
			"id": unicode(self.key),
			"author" : unicode(self.author),
			"content" : self.content,
			"date" : unicode(self.date),
			"subject" : self.subject,
			"x" : self.x,
			"y" : self.y,
			"z" : self.z})

def key(email):
	"""Constructs a datastore key for a Guestbook entity with guestbook_name."""
	return db.Key.from_path('StickyNote', email)
