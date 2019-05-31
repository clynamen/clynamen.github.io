---
layout: post
title: "Julia and the current status of OpenCV bindings"
date: 2019-05-31 01:00:00 +0200
comments: true
categories: [julia, opencv]
---

**Recently the Julia [Cxx.jl package](https://github.com/JuliaInterop/Cxx.jl) came back to life again.** The package uses Clang for calling C++ at runtime, possibly making it the most interesting tool for interfacing with a lot of C++ libraries.
Since Julia seems really promising for writing Computer Vision algorithms, both for support for Machine Learning and linear algebra in general with high performance, I wanted to try the OpenCV bindings. 
The idea seemed appealing to quite some people since there are three attempts in this application, that not surprisingly share the same name:

- [OpenCV.jl](https://github.com/JuliaOpenCV/OpenCV.jl)
- [OpenCV.jl](https://github.com/maxruby/OpenCV.jl)
- ..and... [OpenCV.jl](https://github.com/TakekazuKATO/OpenCV.jl)

A bit sadly, all three projects seem abandoned now. I am not surprised since both Julia and OpenCV were undergoing many changes in the latest years. Even if bindings are a thin layer of intermixed language code, it is quite a burden to maintain them, especially during the initial phase where no one has a real interest in them. 

**The OpenCV project itself provides two main bindings, for python and java.** I have never used the java binding, but I can assure you the python binding is damn good. Since all the hard work is done by the OpenCV library itself and, elsewhere, by numpy, it is possible to quickly use the complex algorithm offered by OpenCV with C++ performance. These bindings are two extra modules built along with the full source, so they are provided in almost all distributions. 
Most importantly, being included in the same repo, these bindings are maintained by the same OpenCV developers. 

The generation of bindings for other languages, however, is left as an exercise to the reader.

As explained in the [official documentation](https://docs.opencv.org/3.4/da/d49/tutorial_py_bindings_basics.html) the generation of java and python binding is a quick and dirty process: A python script parses the headers and provides function signatures to a generator, which in turn generates the python (or java) code using template strings and some handcoded files. The process does not seem really modular, and probably today there are better options, especially for the parser (e.g. libclang). But being self-contained and targeted for opencv only, **it just works**.

As for Julia, lovers of other languages created their own bindings. Just to name a few:

 - [opencv-rust](https://github.com/twistedfall/opencv-rust)
 - [node-opencv](https://github.com/peterbraden/node-opencv)
 - [haskell - opencv](http://hackage.haskell.org/package/opencv)

Needless to say, these libraries use different implementation approaches:

 - Writing a C library first, and then use the [FFI](https://en.wikipedia.org/wiki/Foreign_function_interface) for C
 - Wrap the C++ code in a library that can be imported in the desired language.
 - Perform a C++ low-level call

Now, all the three Julia implementation cited above seems to have taken the 'Call C++ code directly' approach using the Cxx.jl library. After all, clang is powerful enough to do this kind of magic today. It is kind of amazing that compiled and JIT code can talk each other, almost if as if we are using languages built upon a high-level runtime (e.g. C# and VisualBasic on CLR, Java and Scala on the JVM etc...).

So, coming back to the original problem, I would like to improve or write an OpenCV binding for Julia. Still, **I am not sure which is the best approach.** 
Using the Cxx.jl library, even if quite elegant and easy to read (since all the ugly stuff stays in the Cxx.jl module itself) involves writing most of the code manually. Whenever functions are added/removed/modified in OpenCV, we need to manually update our bindings. 
Of course, this happens often, but not so often to be an unmanageable burden (it is the interest of the same OpenCV developers to change the API slowly, without breaking changes). 

**However the parser approach used by OpenCV makes more sense**: Code is generated automatically, except for a few special cases for convenience or performance reason. Only small updates should be required, new functions will be automatically supported, and maybe one day the binding can be merged in the same OpenCV library.

It is hard to chose one of the two paths without prototyping a bit with them. I am currently evaluating the generator approach. I will write about the progress in a new post, hopefully soon.