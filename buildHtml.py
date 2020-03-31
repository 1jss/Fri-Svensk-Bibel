# coding= utf-8

import os, sys, io, re, json, glob
from collections import OrderedDict

def listdir_nohidden(path):
    return glob.glob(os.path.join(path, '*'))

mapp_ordlistor = 'ordlistorHtml/'
ordlistor = listdir_nohidden(mapp_ordlistor)

mapp_data = 'data/'
fillista = listdir_nohidden(mapp_data)

for filnamn in fillista:
	print ("Arbetar med: " + filnamn)
	with open(filnamn, 'r+b') as fil_data:
		text = fil_data.read().decode('utf_8')
		for ordlista in ordlistor:
			# print ("Ordlista: " + ordlista)
			f = io.open(ordlista, mode="r", encoding="utf-8") # Open utf-encoded JSON
			lista = json.load(f, object_pairs_hook=OrderedDict) # Load json i order
			for a, b in lista['ordpar'].items():
				if lista['regex']:
					text = re.sub(a, b, text, flags=re.DOTALL)
				else:
					text = text.replace(a, b)

		fil_data.seek(0)
		fil_data.write(text.encode('utf8'))
		fil_data.truncate()
