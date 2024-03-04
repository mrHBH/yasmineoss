find_package(Boost COMPONENTS program_options REQUIRED)
find_package(Threads REQUIRED)

set(TARGET simplehttpserver)

# Add request_handler.cpp to the list of sources
add_executable(${TARGET}
        main.cpp
        request_handler.cpp
        WebSocketHandler.cpp
        
        ) # Add this line


target_compile_features(${TARGET} PUBLIC
        cxx_std_17)

target_include_directories(${TARGET} PUBLIC
        ${Boost_INCLUDE_DIRS})

target_link_libraries(${TARGET} PRIVATE
        ${Boost_LIBRARIES}
        Threads::Threads)