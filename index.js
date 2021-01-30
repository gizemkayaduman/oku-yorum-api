const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Database = require('./src/connection');
const passwordHash = require('password-hash');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/register', (req, res) => {
    const email = req.body.email;
    const hashedPassword = passwordHash.generate(req.body.password);
    const username = req.body.username;
    const name = req.body.name;
    const surname = req.body.surname;
    new Database()
        .query('SELECT * FROM user WHERE user_name = ? OR email=?', [username, email])
        .then((rows) => {
            if (rows.length > 0) {
                return false
            }
            return true
        })
        .then(registerStatus => {
            let result = null
            if (!registerStatus) {
                return result = false
            }
            result = new Database()
                .query('INSERT INTO user(email, password, user_name, name,surname )VALUES(?,?,?,?,?)', [email, hashedPassword, username, name, surname])
                .then(record => {
                    if (record.insertId) {
                        return true
                    }
                    return false
                })
            return result
        })
        .then(status => res.send({ status }))
        .catch(err => {
            console.log(err)
            res.json({ status: false })
        })

})

app.post('/login', (req, res) => {
    new Database()
        .query('SELECT * FROM user WHERE email = ? AND password = ?', [req.body.email, req.body.password])
        .then(record => {
            const user = {
                userID: null,
                email: null,
                userName: null,
                name: null,
                surname: null,
                books: []
            }
            record.forEach(element => {
                user.userID = element.user_id
                user.email = element.email
                user.userName = element.user_name
                user.name = element.name
                user.surname = element.surname
            });
            return user
        })
        .then(user => {
            new Database()
                .query("select * from book where user_id = ?", user.userID)
                .then(books => {
                    books.forEach(book => {
                        const result = {
                            bookID: book.book_id,
                            name: book.book_name,
                            autName: book.aut_name
                        }
                        user.books.push(result)
                    })
                    res.json(user)
                })
        })
        .catch(err => {
            res.json({ status: false })
        })

})

app.get('/books', (req, res) => {
    new Database()
        .query('SELECT * FROM book ORDER BY create_date DESC')
        .then(books => {
            const bookList = [];
            books.forEach(element => {
                const book = {
                    bookID: element.book_id,
                    name: element.book_name,
                    autName: element.aut_name,
                    commentNumber: element.number_commits || 0,
                    quotationNumber: element.number_quo || 0
                };
                bookList.push(book)
            })
            res.json(bookList)
        })
        .catch(err => {
            res.json({
                status: false,
                err
            })
        })
});

app.post('/search', (req, res) => {
    const result = [];
    new Database()
        .query("SELECT book.book_id,book_name,aut_name,user.user_name,number_quo,number_commits FROM book " +
            "LEFT JOIN user ON book.user_id=user.user_id WHERE book_name LIKE ? OR aut_name LIKE ?", ['%' + req.body.bookname + '%', '%' + req.body.autname + '%'])
        .then(record => {
            record.forEach(element => {
                const books = {
                    bookID: element.book_id,
                    bookName: element.book_name,
                    autName: element.aut_name,
                    userName: element.user_name,
                    commits: element.number_commits ? element.number_commits : 0,
                    quotations: element.number_quo ? element.number_quo : 0
                }
                result.push(books)
            });
            res.json(result)
        })


        .catch(err => {
            res.json({ status: false })
        })
})

app.post('/add-comment', (req, res) => {
    new Database()
        .query("SELECT book.number_commits FROM book where book_id = ?", [req.body.bookID])
        .then(record => {
            newCommitNumber = record[0].number_commits + 1;
            new Database()
                .query("INSERT INTO commit(user_id,book_id,commit) VALUES(?,?,?)",
                    [req.body.userID, req.body.bookID, req.body.commit])
                .then(record => {
                    if (record.insertId) {
                        new Database()
                            .query("UPDATE book SET number_commits = ? WHERE book_id= ?",
                                [newCommitNumber, req.body.bookID])
                        return res.json({ status: true })
                    }
                    return res.json({ status: false });

                })
        })
})

app.post('/add-book', (req, res) => {
    const bookName = req.body.bookname;
    const autName = req.body.autname;
    const userID = req.body.userID;
    new Database()
        .query('SELECT * FROM book WHERE book_name=? AND aut_name=?', [bookName, autName])
        .then((rows) => {
            if (rows.length > 0) {
                return false
            }
            return true
        })
        .then(status => {
            let result = null
            if (!status) {
                return result = false
            }
            result = new Database()
                .query('INSERT INTO book(book_name,aut_name,user_id )VALUES(?,?,?)', [bookName, autName, userID])
                .then(record => {
                    if (record.insertId) {
                        return true
                    }
                    return false
                })
            return result
        })
        .then(status => res.send({ status }))
})

app.post('/add-quo', (req, res) => {
    new Database()
        .query("SELECT book.number_quo FROM book where book_id = ?", [req.body.bookID])
        .then(record => {
            newQuoNumber = record[0].number_quo + 1;
            new Database()
                .query("INSERT INTO quotation(user_id,book_id,quotation) VALUES(?,?,?)",
                    [req.body.userID, req.body.bookID, req.body.quo])
                .then(record => {
                    if (record.insertId) {
                        new Database()
                            .query("UPDATE book SET number_quo = ? WHERE book_id= ?",
                                [newQuoNumber, req.body.bookID])
                        return res.json({ status: true })
                    }
                    return res.json({ status: false });
                })
        })
})

// TODO Gizem
app.get('/profile/:id', (req, res) => {
    new Database()
    .query('SELECT user_id,user_name from user WHERE user_id=?',req.params.id)
    .then(record => {
        const userInfo ={
            userID: null,
            userName: null,
            userComments: [],
            userQuotations: []  
        }
        record.forEach(element => {
            userInfo.userID=element.user_id,
            userInfo.userName=element.user_name
        });     
         return userInfo
    })
    .then(userInfo => {
        new Database()
        .query('SELECT commit,commit_id FROM commit WHERE user_id=?',req.params.id)
        .then(userComments => {
            userComments.forEach(comment =>{
                const result = {
                    commitID: comment.commit_id,
                    commit: comment.commit
                }
                userInfo.userComments.push(result)
            })
            return userInfo
        })
        .then(result => {
            new Database()
            .query('SELECT quotation_id,quotation FROM quotation WHERE user_id=?',req.params.id)
            .then(userQuotations => {
                userQuotations.forEach(quotation => {
                    const result = {
                        quotationID: quotation.quotation_id,
                        quotation: quotation.quotation
                    }
                    userInfo.userQuotations.push(result)
                })
                res.json(userInfo)
            })
        })

    })

    
})

//TODO Furkan
app.get('/get-all-quo', (req, res) => {
    new Database()
    .query("SELECT * from quotation ORDER BY create_date DESC")
    .then(record => {
        res.json(record)
    })
})

app.get('/get-all-comment', (req, res) => {
    new Database()
    .query("SELECT * from commit ORDER BY date DESC")
    .then(record => {
        res.json(record)
    })

})

app.get('/get-comment/book/:id', (req, res) => {
    new Database()
    .query("SELECT date,commit from commit where book_id = ? ORDER BY date DESC",[req.params.id])
    .then(record => {
        res.json(record)
    })
})

app.get('/get-quo/book/:id', (req, res) => {
    new Database()
    .query("SELECT create_date,quotation from quotation where book_id = ? ORDER BY create_date DESC",[req.params.id])
    .then(record => {
        res.json(record)
    })

})

app.get('/get-comment/user/:id', (req, res) => {
    new Database()
    .query("SELECT date,commit,commit_id from commit where user_id = ? ORDER BY date DESC",[req.params.id])
    .then(record => {
        res.json(record)
    })
})

app.get('/get-quo/user/:id', (req, res) => {
    new Database()
    .query("SELECT create_date,quotation,quotation_id from quotation where user_id = ? ORDER BY create_date DESC",[req.params.id])
    .then(record => {
        res.json(record)
    })

})

app.listen('3000');