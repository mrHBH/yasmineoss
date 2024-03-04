#include <algorithm>
#include <boost/asio/dispatch.hpp>
#include <boost/asio/strand.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/config.hpp>
#include <boost/program_options.hpp>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <memory>
#include <string>
#include <thread>
#include <vector>
#include "request_handler.hpp"
#include <boost/beast/websocket.hpp>
#include "WebSocketHandler.hpp"

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
namespace po = boost::program_options;

using tcp = boost::asio::ip::tcp;

// Return a reasonable mime type based on the extension of a file.
beast::string_view mime_type(beast::string_view path) {
    using beast::iequals;

    auto const ext = [&path] {
        auto const pos = path.rfind(".");
        if (pos == beast::string_view::npos) return beast::string_view{};
        return path.substr(pos);
    }();

    if (iequals(ext, ".htm")) return "text/html";
    if (iequals(ext, ".html")) return "text/html";
    if (iequals(ext, ".php")) return "text/html";
    if (iequals(ext, ".css")) return "text/css";
    if (iequals(ext, ".txt")) return "text/plain";
    if (iequals(ext, ".js")) return "application/javascript";
    if (iequals(ext, ".json")) return "application/json";
    if (iequals(ext, ".xml")) return "application/xml";
    if (iequals(ext, ".swf")) return "application/x-shockwave-flash";
    if (iequals(ext, ".flv")) return "video/x-flv";
    if (iequals(ext, ".png")) return "image/png";
    if (iequals(ext, ".jpe")) return "image/jpeg";
    if (iequals(ext, ".jpeg")) return "image/jpeg";
    if (iequals(ext, ".jpg")) return "image/jpeg";
    if (iequals(ext, ".gif")) return "image/gif";
    if (iequals(ext, ".bmp")) return "image/bmp";
    if (iequals(ext, ".ico")) return "image/vnd.microsoft.icon";
    if (iequals(ext, ".tiff")) return "image/tiff";
    if (iequals(ext, ".tif")) return "image/tiff";
    if (iequals(ext, ".svg")) return "image/svg+xml";
    if (iequals(ext, ".svgz")) return "image/svg+xml";

    return "application/text";
}

// Append an HTTP rel-path to a local filesystem path.
// The returned path is normalized for the platform.
std::string path_cat(beast::string_view base, beast::string_view path) {
    if (base.empty()) return std::string(path);
    std::string result(base);
#ifdef BOOST_MSVC
    char constexpr path_separator = '\\';
    if (result.back() == path_separator) result.resize(result.size() - 1);
    result.append(path.data(), path.size());
    for (auto& c : result)
        if (c == '/') c = path_separator;
#else
    char constexpr path_separator = '/';
    if (result.back() == path_separator) result.resize(result.size() - 1);
    result.append(path.data(), path.size());
#endif
    return result;
}

 
// Report a failure
void fail(beast::error_code ec, char const* what) {
    std::cerr << what << ": " << ec.message() << "\n";
}

// Handles an HTTP server connection
class session : public std::enable_shared_from_this<session> {
    // This is the C++11 equivalent of a generic lambda.
    // The function object is used to send an HTTP message.
    struct send_lambda {
        session& self_;

        explicit send_lambda(session& self) : self_(self) {}

        template <bool isRequest, class Body, class Fields>
        void operator()(http::message<isRequest, Body, Fields>&& msg) const {
            // The lifetime of the message has to extend
            // for the duration of the async operation so
            // we use a shared_ptr to manage it.
            auto sp = std::make_shared<http::message<isRequest, Body, Fields>>(std::move(msg));

            // Store a type-erased version of the shared
            // pointer in the class to keep it alive.
            self_.res_ = sp;

            // Write the response
            http::async_write(self_.stream_, *sp,
                              beast::bind_front_handler(&session::on_write,
                                                        self_.shared_from_this(), sp->need_eof()));
        }
    };

    beast::tcp_stream stream_;
    beast::flat_buffer buffer_;
    std::shared_ptr<std::string const> doc_root_;
    http::request<http::string_body> req_;
    std::shared_ptr<void> res_;
    send_lambda lambda_;

public:
    // Take ownership of the stream
    session(tcp::socket&& socket, std::shared_ptr<std::string const> const& doc_root)
        : stream_(std::move(socket)), doc_root_(doc_root), lambda_(*this) {}

    // Start the asynchronous operation
    void run() {
        // We need to be executing within a strand to perform async operations
        // on the I/O objects in this session. Although not strictly necessary
        // for single-threaded contexts, this example code is written to be
        // thread-safe by default.
        net::dispatch(stream_.get_executor(),
                      beast::bind_front_handler(&session::do_read, shared_from_this()));
    }

    void do_read() {
        // Make the request empty before reading,
        // otherwise the operation behavior is undefined.
        req_ = {};

        // Set the timeout.
        stream_.expires_after(std::chrono::seconds(30));

        // Read a request
        http::async_read(stream_, buffer_, req_,
                         beast::bind_front_handler(&session::on_read, shared_from_this()));
    }

    void on_read(beast::error_code ec, std::size_t bytes_transferred) {
        boost::ignore_unused(bytes_transferred);


        if (ec) return fail(ec, "read");

            // Check if it is a WebSocket upgrade
            if (websocket::is_upgrade(req_)) {
                // Make the session a WebSocket session
                std::make_shared<WebSocketSession>(std::move(stream_.release_socket()))->run();
                return; // We are done with HTTP handling, now it's a WebSocket session
            }

        // This means they closed the connection
        if (ec == http::error::end_of_stream) return do_close();

        if (ec) return fail(ec, "read");

        // Send the response
        handle_request_and_log(*doc_root_, req_, lambda_);
    }

    void on_write(bool close, beast::error_code ec, std::size_t bytes_transferred) {
        boost::ignore_unused(bytes_transferred);

        if (ec) return fail(ec, "write");

        if (close) {
            // This means we should close the connection, usually because
            // the response indicated the "Connection: close" semantic.
            return do_close();
        }

        // We're done with the response so delete it
        res_ = nullptr;

        // Read another request
        do_read();
    }

    void do_close() {
        // Send a TCP shutdown
        beast::error_code ec;
        stream_.socket().shutdown(tcp::socket::shutdown_send, ec);

        // At this point the connection is closed gracefully
    }
};

//------------------------------------------------------------------------------

// Accepts incoming connections and launches the sessions
class listener : public std::enable_shared_from_this<listener> {
    net::io_context& ioc_;
    tcp::acceptor acceptor_;
    std::shared_ptr<std::string const> doc_root_;

public:
    listener(net::io_context& ioc, tcp::endpoint endpoint,
             std::shared_ptr<std::string const> const& doc_root)
        : ioc_(ioc), acceptor_(net::make_strand(ioc)), doc_root_(doc_root) {
        beast::error_code ec;

        //print the incoming address, and port
        std::cout << "Listening on " << endpoint.address().to_string() << ":" << endpoint.port() << std::endl;

        // Open the acceptor
        acceptor_.open(endpoint.protocol(), ec);
        if (ec) {
            fail(ec, "open");
            return;
        }

        // Allow address reuse
        acceptor_.set_option(net::socket_base::reuse_address(true), ec);
        if (ec) {
            fail(ec, "set_option");
            return;
        }

        // Bind to the server address
        acceptor_.bind(endpoint, ec);
        if (ec) {
            fail(ec, "bind");
            return;
        }

        // Start listening for connections
        acceptor_.listen(net::socket_base::max_listen_connections, ec);
        if (ec) {
            fail(ec, "listen");
            return;
        }
    }

    // Start accepting incoming connections
    void run() { do_accept(); }

private:
    void do_accept() {
        // The new connection gets its own strand
        acceptor_.async_accept(net::make_strand(ioc_),
                               beast::bind_front_handler(&listener::on_accept, shared_from_this()));
    }

    void on_accept(beast::error_code ec, tcp::socket socket) {
        if (ec) {
            fail(ec, "accept");
            return;  // To avoid infinite loop
        } else {
            // Create the session and run it
            std::make_shared<session>(std::move(socket), doc_root_)->run();
        }

        // Accept another connection
        do_accept();
    }
};

//------------------------------------------------------------------------------

int main(int argc, char* argv[]) {
    po::options_description desc("Allowed command line options");

    // clang-format off
    desc.add_options()("help", "produce help message")
        ("host", po::value<std::string>()->default_value("0.0.0.0"), "host address to bind to")
        ("port", po::value<unsigned short>()->default_value(8080), "port to expose to")
        ("doc_root", po::value<std::string>()->default_value("/var/www/"), "root directory to serve")
        ("threads", po::value<unsigned short>()->default_value(1), "number of threads to use");
    // clang-format on

    po::variables_map args;
    po::store(po::parse_command_line(argc, argv, desc), args);
    po::notify(args);

    if (args.count("help")) {
        std::cout << desc << "\n";
        return EXIT_SUCCESS;
    }

    auto const address = net::ip::make_address(args["host"].as<std::string>());
    auto const port = args["port"].as<unsigned short>();
    auto const doc_root = std::make_shared<std::string>(args["doc_root"].as<std::string>());
    auto const threads = std::max<int>(1, args["threads"].as<unsigned short>());

    net::io_context ioc{threads};
    std::make_shared<listener>(ioc, tcp::endpoint{address, port}, doc_root)->run();

    std::vector<std::thread> v;
    v.reserve(threads - 1);
    for (auto i = 0; i < threads - 1; ++i) {
        v.emplace_back([&ioc] { ioc.run(); });
    }

    ioc.run();

    return EXIT_SUCCESS;
}