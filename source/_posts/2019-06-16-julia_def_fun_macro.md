---
layout: post
title: "Programmatically create function in Julia with metaprogramming"
date: 2019-06-16 01:00:00 +0200
comments: true
categories: [julia, metaprogramming]
---

In the [last post](/blog/2019/05/31/julia_opencv/), I was evaluating various solutions for generating the **Julia-OpenCV** bindings I dream of.

I am currently studying how the [libcxxwrap](https://github.com/JuliaInterop/libcxxwrap-julia/) library works, in order to check if it fits my requirements. I quickly noticed that it misses the capability of generating function with keywords (see the [Github issue](https://github.com/JuliaInterop/libcxxwrap-julia/issues/27)). This feature would be really interesting for the binding since OpenCV uses a lot of default and keyword arguments, both of which are nicely supported in python. 

But no worries, [Julia is a Lisp](https://docs.julialang.org/en/v1/manual/metaprogramming/index.html) (or, at least, looks very much like it for many reasons). It should be easy to manipulate function code in order to add defaults, keyword, etc...

Let's find out how.

## Basics

The fundamentals of Julia metaprogramming are explained in [the official documentation](https://docs.julialang.org/en/v1/manual/metaprogramming/index.html). You should read that before going further. However, we will start with the easy stuff.

First, let's write a macro that creates a function.

```julia
macro make_fn1(name)
  name_str = "$name"
  quote
      function $(esc(name))()
          println("Hello ", $name_str, "!")
      end
  end
end

@make_fn1(world)
# Hello World!
```

What happens when macro **make_fn1** is called? We first take value of the macro argument **name** and convert it into a string, which will be used later for printing. Then, we return an expression that defines a function. The name of the function comes from the same macro argument. 
When the macro is called, the returned expression is evaluated and thus the function 'world' is defined.

We can inspect the expression returned by **make_fn1** by using the @macroexpand macro:

```julia
julia> @macroexpand @make_fn1(pizza)
quote
    function pizza()
        (Main.println)("Hello ", "pizza", "!")
    end
end
```

Note how in the function declaration we used ```$(esc(name))``` instead of just using ```$(name)```. Otherwise, Julia **hygiene rules** will cause the function to have a random name:

```julia
macro make_fn1_bad(name)
  name_str = "$name"
  quote
      function $(name)()
          println("Hello ", $name_str, "!")
      end
  end
end

julia> @macroexpand @make_fn1_bad(pizza)
quote
    function #18#pizza() # <- random name was generated
        (Main.println)("Hello ", "pizza", "!")
    end
end
```

## Adding arguments

Ok, we can now generate function with arbitrary names, but we still miss arguments. A possible solution for this was discussed in this [discourse thread](https://discourse.julialang.org/t/defining-function-inside-a-macro/9139).

This is the proposed solution:


```julia
macro make_fn2(name, args...)
   name_str = "$name"
   argstup = Tuple(args)

   quote
       function $(esc(name))($(map(esc, argstup)...))
           println($name_str)
           map(println, [($(map(esc, argstup)...))])
       end
   end
end

@make_fn2(example_fun, a, b, c)

julia> example_fun(1.2, "dog", 3)
1.2
dog
3
julia> @macroexpand @make_fn2(example_fun, a, b, c)
quote
    #= /home/clynamen/software/tests/julia/main.jl:50 =#
    function sum_all(a, b, c)
        #= /home/clynamen/software/tests/julia/main.jl:51 =#
        (Main.println)("sum_all")
        #= /home/clynamen/software/tests/julia/main.jl:52 =#
        (Main.map)(Main.println, [a, b, c])
    end
end
```

## A more complex example

ok, how to add default arguments now?

I have tried to extend the previous solution and failed. 
I thought it was possible to use this substitution syntax again but I still didn't 
figure out how the parser works with the macro output.

**However, there is a better way to do this**: We can easily manipulate 
the [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) programmatically, 
by composing list of keywords and arguments. Even better, Julia allows you to
inspect the AST via the ```@dump``` macro:

```julia
julia> Meta.@dump( function(a, b, c="hello") end)
Expr
  head: Symbol function
  args: Array{Any}((2,))
    1: Expr
      head: Symbol tuple
      args: Array{Any}((3,))
        1: Symbol a
        2: Symbol b
        3: Expr
          head: Symbol =
          args: Array{Any}((2,))
            1: Symbol c
            2: String "hello"
    2: Expr
      head: Symbol block
      args: Array{Any}((1,))
        1: LineNumberNode
          line: Int64 1
          file: Symbol none
```

This is pretty handy: you can write an example of the expression you would like to build, 
inspect its AST and use it as a reference. 

Note how the function arguments are just a list of ```Symbol```s and ```Expr```essions.

**Finally**, here an example of a macro that defines a function with default and keyword arguments:

```julia
macro makefn(name, args, kwargs)
   # Let's start defining the name and
   # arguments declaration
   call = Expr(:call)
   push!(call.args, Symbol(name))

   # keyword arguments of the new function
   kwargs_list = []

   # In julia, the keyword arguments are added at
   # the begin of the list, even if they appear
   # last in the syntax. So, process kwargs first:
   for arg in kwargs.args
      if typeof(arg) == Symbol
         # plain keyword arg
         push!(kwargs_list, esc(arg))
      elseif typeof(arg) == Expr
         # default keyword arg
         kw = Expr(:kw)
         push!(kw.args, esc(arg.args[1]))
         push!(kw.args, arg.args[2])

         push!(kwargs_list, kw)
      end
   end

   # Keyword arguments are defined in a
   # :parameters Expr
   parameters = Expr(:parameters)
   parameters.args = kwargs_list

   # add the keyword arguments at the begin of
   # the argument list
   push!(call.args, parameters)

   # now process plain arguments
   for arg in args.args
      if typeof(arg) == Symbol
         # normal arg
         push!(call.args, esc(arg))
      elseif typeof(arg) == Expr
         # default arg
         kw = Expr(:kw)
         push!(kw.args, esc(arg.args[1]))
         push!(kw.args, arg.args[2])
         push!(call.args, kw)
      end
   end

   # a function Expr has two arguments:
   # the declaration and the :block that defines the
   # function implementation.
   # For this example, we define an empty :block
   fn_args = [call, Expr(:block)]
   fn = Expr(:function)

   append!(fn.args, fn_args)
   fn
end

# example usage
@makefn("more_complex_fun", (a, b, c="hello"), (f=1, g="world"))
```

Check out the function generated by the macro:

```
julia> @macroexpand1 @makefn("more_complex_fun", (a, b, c="hello"), (f=1, g="world"))
:(function (Main.more_complex_fun)(a, b, c="hello"; f=1, g="world")
  end)
```

## Conclusions

I think the AST manipulation offers what I need for extending **libcxxwrap**. Probably it will
also be useful during the actual binding generation, allowing to automatically write Julia code that better integrates with the OpenCV interface. 