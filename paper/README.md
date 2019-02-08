---
title: 'Patristic: A toolkit for Phylogenetics in Javascript'
tags:
  - Phylogeny
  - Phylogenetics
authors:
  - name: Anthony A. Boyles
    orcid: 0000-0002-4448-0822
    affiliation: 1
affiliations:
 - name: Data Scientist, Centers for Disease Control and Prevention
   index: 1
date: 25 January 2018
bibliography: references.bib
---

# Summary

While Phylodynamics is not foreign to Javascript environments,
Tools like BioNode.io and Bio.JS

The core of Patristic's approach is a feature-rich implementation of the core
component of phylogenetic trees: namely, branches. Patristic endows its core
branch objects with a fully-realized grammar for traversal, querying, and
modification. Each branch object possesses references to both its parent and its
children, enabling highly efficient bidirectional tree-traversals (at the
expense of serializability, owing to the circular references). Branches exploit
this efficiency with methods to enable rapid computation of relevant statistics,
notably patristic distances between any two leaves in the tree. Accordingly, any
branch object can also generate an equivalent patristic distance matrix
representing the relationships of all of its descendant leaves.

Branches can be created directly, though the typical use case is to leverage
Patristic's parser functions to instantiate Branches. At present, Patristic uses
a modified version of Jason Davies' newick.js [@Davies_undated-py] to assemble
trees from newick files. Similarly, it adapts Maciej Korzepa's neighbor-joining
[@Korzepa2016-cm] to parse distance matrices (implemented as an array of *n*
arrays of length *n*). Branches are also capable of producing Newick and JSON
representations of their underlying data.

# Acknowledgements

The Author appreciates advice from Ells Campbell, Sergei Kniazev, Anupama
Shankar, and Bill Switzer in the process of developing this library.

Patristic was developed in part by adapting code from neighbor-joining
[@Korzepa2016-cm], and newick.js [@Davies_undated-py], both of which are
released under the MIT License.

Any errors or omissions in this document or the Patristic library are solely the
fault of the author.

# References
