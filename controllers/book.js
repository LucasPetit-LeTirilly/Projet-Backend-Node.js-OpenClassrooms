const Book = require('../models/book');
const fs = require('fs');


exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id;
  delete bookObject._userId;
  const book = new Book({
      ...bookObject,
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  book.save()
  .then(() => { res.status(201).json({message: 'Livre enregistré !'})})
  .catch(error => { res.status(400).json( { error })})
};

exports.getAllBooks = (req, res, next) => {
    Book.find()
      .then(books => res.status(200).json(books))
      .catch(error => res.status(400).json({ error }));
} 

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => res.status(200).json(book))
    .catch(error => res.status(404).json({ error }));
}

exports.getBestBooks = (req, res, next) => {
    Book.find()
        .then((books) => {
            books.sort((a,b) => b.averageRating - a.averageRating);
            const bestBooks = [books[0],books[1],books[2]];
            res.status(200).json(bestBooks)
        })
        .catch(error => res.status(404).json({ error }));
}

exports.modifyBook = (req, res, next) => {
  const bookObject = req.file ? {
      ...JSON.parse(req.body.book),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body};

  delete bookObject._userId;
  Book.findOne({ _id: req.params.id })
      .then((book) => {
          if (book.userId != req.auth.userId) {
              res.status(401).json({ message : 'Not authorized'});
          } else {
            if(req.file){
                const filename = book.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, (error) => {
                if (error) throw error;
              });
            };
            Book.updateOne({ _id: req.params.id}, { ...bookObject, _id: req.params.id})
            .then(() => res.status(200).json({message : 'Objet modifié!'}))
            .catch(error => res.status(401).json({ error }));
          }
      })
      .catch((error) => {
          res.status(400).json({ error });
      });
};

exports.addRating = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
        .then(book => {
            const ratingInfos = book.ratings;
            const usersWhoRated = ratingInfos.map((element) =>{
                return element.userId
            });
            if (book.userId === req.auth.userId){
                res.status(401).json({ message : 'Not authorized'});
            }
            else if (usersWhoRated.includes(req.auth.userId)){
                res.status(401).json({ message : 'Not authorized'});
            }
            else {
                let ratingToAdd = req.body;
                ratingToAdd.grade = ratingToAdd.rating;
                delete ratingToAdd.rating;
                let ratings = book.ratings;
                ratings.push(ratingToAdd);
                const allGrades = ratings.map(element => element.grade);
                const totalGrades = allGrades.reduce(
                    (acc, currentValue) => acc + currentValue, 0
                );
                const newAverageRating = totalGrades/allGrades.length;
                Book.updateOne({ _id: req.params.id}, {ratings: ratings, averageRating : newAverageRating})
                .then(() => {
                    Book.findOne({ _id: req.params.id })
                    .then((updatedBook) => res.status(200).json(updatedBook))
                    .catch(error => res.status(500).json({ error }));
                })
                
                    
                .catch(error => res.status(401).json({ error }));
            }
        })
        .catch( error => {
            res.status(500).json({ error });
        });
    

};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id})
      .then(book => {
          if (book.userId != req.auth.userId) {
              res.status(401).json({message: 'Not authorized'});
          } else {
              const filename = book.imageUrl.split('/images/')[1];
              fs.unlink(`images/${filename}`, () => {
                  Book.deleteOne({_id: req.params.id})
                      .then(() => { res.status(200).json({message: 'Objet supprimé !'})})
                      .catch(error => res.status(401).json({ error }));
              });
          }
      })
      .catch( error => {
          res.status(500).json({ error });
      });
};