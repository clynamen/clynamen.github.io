---
layout: post
title: "Julia and OpenCV"
date: 2019-05-31 01:00:00 +0200
comments: true
categories: [julia, opencv]
---

Recently the Julia Cxx package ( https://github.com/JuliaInterop/Cxx.jl ) came back to life again.  The package uses Clang for calling C++ at runtime, possibly making it the most interesting tool for interfacing with a lot of C++ libraries. Indeed, some famous C++ already has its Julia binding built upon Cxx.jl (see list)
Since Julia seems really promising for writing Computer Vision algorithms, both for support for ML and general linear algebra with JIT performance, I wanted to try the OpenCV bindings. 
The idea seemed appealing to quite some people, since there are three attempt in this application, that non surprisingly share the same name:

OpenCV.jl
OpenCV.jl
and... OpenCV.jl
A bit sadly, all three project seem abandoned now. I am not surprised, since both Julia and OpenCV were undergoing many changes. Even if bindings are a thin layer of intermixed language code, it is quite a burden to maintain them, especially during the initial phase were no one has real interest in them. 
The OpenCV project itself provides two main bindings, for python and java. I have never used the java binding, but I can assure you the python binding is damn good. Since all the hard work is done by the OpenCV library itself and, elsewhere, by numpy, it is possible to quickly use the complex algorithm offered by OpenCV. These bindings are two extra modules built along the full source, so they are almost always provided.     Being included in the same repo, they are maintained by the same OpenCV developers. 

The generation of bindings for other languages, however, is left as an exercise to the reader.

As explained in the official documentation (https://docs.opencv.org/3.4/da/d49/tutorial_py_bindings_basics.html) the generation of java and python binding is a quick and dirty process: A python script parses the headers and provides function signatures to  a generator, which in turn generates the python (or java) code using template strings and some handcoded files. The process does not seem really modular, and probably today there are better options, especially for the parser (e.g. use libclang?). But being self-contained and targeted for opencv only, it just works.

As for Julia, lovers of other languages undertook this trial. Needless to say, using different approaches:
 - opencv-rust  generates rust code using a modified version of the java generator
 - ...
 - ... 

Now, all the three julia implementation cited before seems to have taken the 'Call C++ code directly' approach using the Cxx.jl library. After all, clang is power enough to do this kind of magic today, and it is kind of amazing that compiled and JIT code can talk each other, almost if as if we are using languages built upon the same runtime (e.g. C# and VisualBasic on CLR, Java and scala on the JVM etc...)

Still, I ma not sure this is the best approach. Even if quite elegant and easy to read (since all the ugly stuff stays in Cxx) it involves writing most of the code manually. Whenever functions are added/removed/modified in OpenCV, we need to manually update our bindings. Of course this happens often, but not so often to be a burden (it is interest of the same OpenCV developers to change the API slowly, without breaking changes). Still the parser approach used by OpenCV makes sense. 

It is an hard to chose one of the two path without prototyping a bit with them. So I guess I will start with that first and choose later. 

