---
layout: post
title: "A basic HTTP WebM server in rust"
date: 2020-04-23 01:00:00 +0200
comments: true
categories: [rust, gstreamer]
---

I am in the mid of developing a personal project which involves cameras and videostreaming.

While working on this project, I built a small port of the [HTTP streaming server of Sebastian Dröge](https://github.com/sdroege/http-launch) **from C into rust**:

[clynamen/basic_http_webm_server_rust](https://github.com/clynamen/basic_http_webm_server_rust)

The server uses a minimal tokio server and the [gstreamer-rs](https://gitlab.freedesktop.org/gstreamer/gstreamer-rs) library (of which the same S. Dröge is the main contributor).

The main difference between the two version consists in the absence of the **multisocketsink** element, which is not currently available on rust. This element allows to connect multiple TCP sockets to the gstreamer pipeline, thus providing a simple way for sending the video to multiple clients. In the rust version, this is replaced (probably in a bad way) by an appsink and multiple [mpsc](https://doc.rust-lang.org/std/sync/mpsc/) queues.
