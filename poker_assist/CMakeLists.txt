cmake_minimum_required(VERSION 3.10)
project(PokerAssist VERSION 2.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 源文件
set(SOURCES
    main.cpp
    core/card.cpp
    core/deck.cpp
    core/evaluator.cpp
    core/calculator.cpp
    ui/console.cpp
    ui/input.cpp
)

# 头文件
set(HEADERS
    core/card.h
    core/deck.h
    core/evaluator.h
    core/calculator.h
    ui/console.h
    ui/input.h
)

# 可执行文件
add_executable(poker_assist ${SOURCES})

# 包含目录
target_include_directories(poker_assist PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

# 编译选项
if(MSVC)
    target_compile_options(poker_assist PRIVATE /W4)
else()
    target_compile_options(poker_assist PRIVATE -Wall -Wextra -pedantic)
endif()

# Windows特定设置
if(WIN32)
    target_compile_definitions(poker_assist PRIVATE _CRT_SECURE_NO_WARNINGS)
endif()