// WebSocketHandler.hpp

#ifndef WEBSOCKETHANDLER_HPP
#define WEBSOCKETHANDLER_HPP

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/strand.hpp>
#include <cstdlib>
#include <memory>
#include <string>
#include <vector>

namespace beast = boost::beast;          // from <boost/beast.hpp>
namespace http = beast::http;            // from <boost/beast/http.hpp>
namespace websocket = beast::websocket;  // from <boost/beast/websocket.hpp>
namespace net = boost::asio;             // from <boost/asio.hpp>
using tcp = boost::asio::ip::tcp;        // from <boost/asio/ip/tcp.hpp>

void fail(beast::error_code ec, char const* what); // You might already have this in another file

// WebSocket session class to manage a WebSocket connection
class WebSocketSession : public std::enable_shared_from_this<WebSocketSession> {
public:
    explicit WebSocketSession(tcp::socket socket);
    void run();

private:
    websocket::stream<beast::tcp_stream> ws_;
    beast::flat_buffer buffer_;

    void on_accept(beast::error_code ec);
    void do_read();
    void on_read(beast::error_code ec, std::size_t bytes_transferred);
    void on_write(beast::error_code ec, std::size_t bytes_transferred);
    void send_pong();
};

#endif // WEBSOCKETHANDLER_HPP
