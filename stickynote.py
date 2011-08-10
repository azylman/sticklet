from google.appengine.ext import db

class StickyNoteModel(db.Model):
	author = db.UserProperty()
	content = db.StringProperty(multiline=True)
	date = db.DateTimeProperty(auto_now_add=True)
	subject = db.StringProperty()
	x = db.IntegerProperty()
	y = db.IntegerProperty()
	z = db.IntegerProperty()

class snModel(StickyNoteModel):
	def to_dict(self):
		return dict({
			"id": unicode(self.key()),
			"author" : unicode(self.author),
			"content" : self.content,
			"date" : unicode(self.date),
			"subject" : self.subject,
			"x" : self.x,
			"y" : self.y,
			"z" : self.z})

def key(email):
	return db.Key.from_path('StickyNote', email)
