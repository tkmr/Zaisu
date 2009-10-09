#!/usr/local/bin/ruby
require "webrick"
require "webrick/https"

def to_cert(file)
  OpenSSL::X509::Certificate.new(open(file))
end

def to_key(file)
  OpenSSL::PKey::RSA.new(open(file))
end

port = ARGV.shift || 80
ip   = ARGV.shift || "127.0.0.1"
isSSL = ARGV.shift || false
cert = ARGV.shift || nil
key = ARGV.shift || nil

conf = {:DocumentRoot => ".",
  :BindAddress => ip,
  :Port => port,
  :SSLEnable => isSSL}

if isSSL
  conf[:SSLCertificate] = to_cert(cert)
  conf[:SSLPrivateKey]  = to_key(key)
end

server = WEBrick::HTTPServer.new(conf)
trap('INT'){ server.shutdown }
server.start
