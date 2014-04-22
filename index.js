#!/usr/bin/env node
var martinus = require("martinus-scrape"),
	request = require("request"),
	async = require("async");

function booksToXML(books) {
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

	var imgs = coll.ele("images");

	books.forEach(function (book) {
		coll.ele(buildBookEntry(book));
		imgs.ele({
			image: {
				"@format": "JPEG",
				"@id": makeFilename(book.imageUrl)
			}
		})
	})

	return xml.end({pretty: true, indent: "\t", newline: "\n"});
}

function zipBooks(books, finalCb) {
	xml = booksToXML(books);
	zip = new require("node-zip")();
	zip.file("tellico.xml", xml);
	async.each(books, function (book, cb) {
		if (!book.imageUrl) {
			cb(null);
		}
		request({
			url: book.imageUrl,
			encoding: null
		}, function (err, response, body) {
			if (err) {
				cb(err);
			}
			var filename = makeFilename(book.imageUrl);
			zip.file("images/" + filename, body);
			cb(null);
		})}, function(err) {
			var zipData = zip.generate({
				type: "string"
			});
			if (err) {
				process.stderr.write("Error when zipping images: " + err);
			}
			finalCb(err, zipData);
		});
}

function buildBookEntry(book) {
	var imageUrl;
	if (book.imageUrl) {
		imageUrl = makeFilename(book.imageUrl)
	}
	var entry = {
		entry: {
			title: book.title,
			publisher: book.publisher,
			pub_year: book.pubYear,
			isbn: book.ISBN,
			cover: imageUrl
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

function makeFilename(URL) {
	var parts = URL.split("/");
	return parts[parts.length - 1]
}

var searchTerm;

if (process.argv[2] === "isbn") {
	searchTerm = martinus.normalizeISBN(process.argv[3]);
} else {
	searchTerm = process.argv[2];
}

martinus.getBook(searchTerm, function(err, books) {
	if (err) {
		process.stderr.write("Error when downloading book info: " + err);
		return;
	}
	zipBooks(books, function(err, zipFile) {
		if (err) {
			//We just try to return everything possible
		}
		process.stdout.write(zipFile, "binary");
	});
});