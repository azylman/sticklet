from google.appengine.ext import db

class StickyNoteModel(db.Model):
    author = db.UserProperty()
    content = db.TextProperty()
    date = db.DateTimeProperty(auto_now_add=True)
    subject = db.StringProperty()
    color = db.StringProperty()
    trash = db.IntegerProperty()
    x = db.IntegerProperty()
    y = db.IntegerProperty()
    z = db.IntegerProperty()
    modify_date = db.DateTimeProperty()
    delete_date = db.DateTimeProperty()

class snModel(StickyNoteModel):
    def to_dict(self):
        return dict({
            "id": unicode(self.key()),
            "author" : unicode(self.author),
            "content" : self.content,
            "date" : unicode(self.date),
            "subject" : self.subject,
            "color" : self.color,
            "trash" : self.trash,
            "x" : self.x,
            "y" : self.y,
            "z" : self.z,
            "modified" : unicode(self.modify_date),
            "deleted" : unicode(self.delete_date)})

def key(email):
    return db.Key.from_path('StickyNote', email)
