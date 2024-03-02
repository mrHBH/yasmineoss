use serde::Deserialize;
use std::error::Error;

 
#[derive(Deserialize, Debug)]
struct ApiRes {
    ip: String,
}

 
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

 

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = SocketAddr::from(([0, 0, 0, 0], 8420));
    let listener = TcpListener::bind(&addr).await?;



    println!("Listening on: http://{}", addr);

    let res = reqwest::get("https://api.myip.com").await?.json::<ApiRes>().await?;

    // Print out the IP address
    println!("IP from API: {}", res.ip);
    


  

    loop {
        let (mut stream, _) = listener.accept().await?;
        let ip_clone = res.ip.clone(); // Clone the IP address


        tokio::spawn(async move {
            let mut buffer = [0; 1024];
            let _ = stream.read(&mut buffer).await;

            let contents = "<h1>Hello-- world from rust!</h1> <p>IP from API: ".to_string() + &ip_clone + "</p>";
            let content_length = contents.len();
            let response = format!("HTTP/1.1 200 OK\r\nContent-Length: {content_length}\r\n\r\n{contents}");
            let _ = stream.write_all(response.as_bytes()).await;
        });
    }
}