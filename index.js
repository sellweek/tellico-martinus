#!/usr/bin/env node
var martinus = require("martinus-scrape")
	, zip = require("node-zip");

function booksToXML(books, cb) {
	var xml = require("xmlbuilder").create("tellico",
		{version: "1.0", encoding: "UTF-8"});
	xml.att("xmlns", "http://periapsis.org/tellico/");
	xml.att("syntaxVersion", "11");
	xml.dtd("-//Robby Stephenson/DTD Tellico V11.0//EN", "http://periapsis.org/tellico/dtd/v11/tellico.dtd")
	var coll = xml.ele("collection", "", {
		title: "Martinus.sk search",
		type: "2"
	});
	coll.ele({
		fields: {
			"#list": [
				{
					field: {
						"@name": "_default"
					}
				}
			]
		}
	});

	books.forEach(function (book) {
		coll.ele(buildBookEntry(book));
	})

	console.log(xml.end({pretty: true, indent: "\t", newline: "\n"}));
}

function zipBooks(books, cb) {
	booksToXML(books, function() {});
}

function buildBookEntry(book) {
	var imageURL;
	if (book.imageURL) {
		var imageURL = book.imageURL.split("/");
	} else {
		imageURL = [""];
	}
	var entry = {
		entry: {
			title: book.title,
			publisher: book.publisher,
			pub_year: book.pubYear,
			isbn: book.ISBN,
			cover: imageURL[imageURL.length - 1]
		}
	};
	if (book.authors.length > 0) {
		entry.entry.authors = {
			"#list": []
		};
	}
	book.authors.forEach(function(name) {
		entry.entry.authors["#list"].push({
			author: name
		})
	});
	return entry;
}

var searchTerm;

if (process.argv[2] === "isbn") {
	searchTerm = martinus.normalizeISBN(process.argv[3]);
} else {
	searchTerm = process.argv[2];
}

martinus.getBook(searchTerm, function(err, books) {
	if (err) {
		console.log("Error when downloading book info: " + err);
		return;
	}
	zipBooks(books, function(err, zipFile) {
		if (err) {
			console.log("Error when zipping book info: " + err);
			return;
		}
		process.stdout.write(zipFile, "binary");
	});
});