HERITAGE
========

Heritage Equals Retro Interpreting Text Adventure Game Engine

![screenshot](/screenshot.png)

What is HERITAGE?
=================

HERITAGE is a text adventure game engine, written in Javascript, capable of
interpreting .heritage files.

.heritage files, also known as: HERITAGE Game Files, are files written in the
HERITAGE file format. These files are fairly simple, yet powerful, markup
files, written in a format specially tailored for the text adventure game
genre. It is designed to be easy to use, yet powerful enough to make serious
text adventure games in.

For an example, please look at the example directory. Documentation on how to
write a text adventure game for HERITAGE is available on
[Read The Docs](http://heritage.readthedocs.org/en/latest/)

How to play
===========

Clone using git or simply download an archive, then extract it. To play without
uploading to a server, open index.html in Firefox (Webkit-based browsers seem
to not allow requesting local files over AJAX requests, and will fail to load
the included example game, but may be able to load online games).

How to deploy
=============

Clone using git or simply download an archive, then extract and upload the content
to your web server. Any basic web server will do, as HERITAGE runs completely
client-side.

To add custom games for easy loading, place them in a subdirectory with the
preferred name. For example, the example game can be loaded using
'load example', because it is placed in the directory called 'example'.

LICENSE
=======

HERITAGE is released under the GNU GPLv3+. Alternatively, some files are
available under another license. These are:
- jquery-1.11.1(.min).js (available under the MIT license)
- index.html (available under the CC0 license)
- style.css (available under the CC0 license)
- README (available under the CC0 license)
- example/* (available under the CC0 license)

The file COPYING is Copyright (C) 2007 Free Software Foundation, Inc.
