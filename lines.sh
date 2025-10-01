#!/bin/bash

# 统计代码行数脚本
# 排除空行和只有空格的行，按文件类型分区统计，排除依赖文件夹

# 获取当前时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE=".data.${TIMESTAMP}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 排除的文件夹列表（支持通配符）
EXCLUDE_DIRS=(
    "node_modules"
    ".git"
    ".svn"
    ".hg"
    ".idea"
    ".vscode"
    ".vs"
    "dist"
    "build"
    "out"
    "target"
    "bin"
    "obj"
    ".next"
    ".nuxt"
    ".cache"
    ".npm"
    ".yarn"
    "vendor"
    "packages/*/node_modules"
    "*/node_modules"
    ".data.*"
    ".github"
)

# 构建 find 命令的排除参数
build_exclude_args() {
    local excludes=()
    for pattern in "${EXCLUDE_DIRS[@]}"; do
        excludes+=(-not -path "*/$pattern" -not -path "*/$pattern/*")
    done
    echo "${excludes[@]}"
}

# 文件类型映射 - 更精确的分类
declare -A FILE_TYPES=(
    ["py"]="Python"
    ["js"]="JavaScript"
    ["ts"]="TypeScript"
    ["jsx"]="ReactJS"
    ["tsx"]="ReactTS"
    ["vue"]="Vue"
    ["svelte"]="Svelte"
    ["java"]="Java"
    ["cpp"]="C++"
    ["c"]="C"
    ["h"]="CHeader"
    ["hpp"]="C++Header"
    ["html"]="HTML"
    ["css"]="CSS"
    ["scss"]="SCSS"
    ["less"]="LESS"
    ["styl"]="Stylus"
    ["json"]="JSON"
    ["xml"]="XML"
    ["yml"]="YAML"
    ["yaml"]="YAML"
    ["md"]="Markdown"
    ["sh"]="Shell"
    ["bash"]="Bash"
    ["zsh"]="Zsh"
    ["sql"]="SQL"
    ["go"]="Go"
    ["rs"]="Rust"
    ["php"]="PHP"
    ["rb"]="Ruby"
    ["swift"]="Swift"
    ["kt"]="Kotlin"
    ["dart"]="Dart"
    ["lua"]="Lua"
    ["r"]="R"
    ["pl"]="Perl"
    ["pm"]="PerlModule"
    ["tcl"]="TCL"
    ["ex"]="Elixir"
    ["exs"]="ElixirScript"
    ["erl"]="Erlang"
    ["hrl"]="ErlangHeader"
)

# 初始化统计数组
declare -A language_stats
declare -A file_stats
declare -a processed_files
declare -a excluded_files

# 统计单个文件的非空行数
count_lines() {
    local file="$1"
    # 排除空行和只有空格的行，统计行数
    local lines=$(grep -v '^[[:space:]]*$' "$file" | wc -l | awk '{print $1}')
    echo $lines
}

# 获取文件类型 - 改进的特殊文件处理
get_file_type() {
    local file="$1"
    local filename=$(basename "$file")
    local extension="${file##*.}"
    
    # 特殊文件处理
    case "$filename" in
        "Makefile"|"makefile"|"GNUmakefile") echo "Makefile" ;;
        "Dockerfile"|"Dockerfile.*") echo "Dockerfile" ;;
        ".gitignore"|".gitmodules"|".gitattributes") echo "GitConfig" ;;
        ".eslintrc"*|".eslintignore") echo "ESLint" ;;
        ".prettierrc"|".prettierignore") echo "Prettier" ;;
        "package.json"|"package-lock.json"|"yarn.lock"|"pnpm-lock.yaml") echo "PackageConfig" ;;
        "tsconfig.json"|"jsconfig.json") echo "TypeScriptConfig" ;;
        "webpack.config.js"|"rollup.config.js"|"vite.config.js"|"vite.config.ts") echo "BuildConfig" ;;
        "*.d.ts") echo "TypeScriptDeclarations" ;;
        "LICENSE"|"LICENCE"|"COPYING") echo "License" ;;
        "README"|"README.md"|"README.txt"|"README.rst") echo "Readme" ;;
        "CHANGELOG"|"CHANGELOG.md"|"HISTORY.md") echo "Changelog" ;;
        *) 
            if [[ ${FILE_TYPES[$extension]+_} ]]; then
                echo "${FILE_TYPES[$extension]}"
            else
                echo "Other"
            fi
            ;;
    esac
}

# 检查是否应该排除文件
should_exclude() {
    local file="$1"
    
    # 排除常见的配置文件但不在常规排除列表中的文件
    case "$(basename "$file")" in
        ".DS_Store"|"Thumbs.db"|"desktop.ini") return 0 ;;
        *".log"|*".tmp"|*".temp"|*".bak"|*".backup") return 0 ;;
    esac
    
    # 检查排除目录
    for pattern in "${EXCLUDE_DIRS[@]}"; do
        if [[ "$file" == *"/$pattern"* ]] || [[ "$file" == "$pattern"* ]]; then
            return 0
        fi
    done
    
    return 1
}

# 递归处理目录
process_directory() {
    local dir="$1"
    local exclude_args=$(build_exclude_args)
    
    echo -e "${CYAN}正在扫描目录: ${dir}${NC}"
    
    # 使用 find 命令查找所有文件，应用排除规则
    while IFS= read -r -d '' file; do
        # 转换为相对路径
        local relative_path=${file#$(realpath "$dir")/}
        relative_path=${relative_path#./}  # 移除开头的 ./
        
        if should_exclude "$relative_path"; then
            excluded_files+=("$relative_path")
            continue
        fi
        
        if [[ -f "$file" ]]; then
            local lines=$(count_lines "$file")
            local file_type=$(get_file_type "$file")
            
            # 更新语言统计
            language_stats["$file_type"]=$((language_stats["$file_type"] + lines))
            
            # 更新文件统计
            file_stats["$file_type"]+="$relative_path:$lines"$'\n'
            
            processed_files+=("$relative_path:$file_type:$lines")
        fi
    done < <(find "$dir" -type f ${exclude_args} -print0 2>/dev/null)
}

# 显示排除的文件统计
show_excluded_stats() {
    if [[ ${#excluded_files[@]} -gt 0 ]]; then
        echo -e "${YELLOW}已排除的文件/文件夹统计:${NC}"
        declare -A exclude_count
        
        for file in "${excluded_files[@]}"; do
            for pattern in "${EXCLUDE_DIRS[@]}"; do
                if [[ "$file" == *"/$pattern"* ]] || [[ "$file" == "$pattern"* ]]; then
                    exclude_count["$pattern"]=$((exclude_count["$pattern"] + 1))
                    break
                fi
            done
        done
        
        for pattern in "${!exclude_count[@]}"; do
            echo -e "  ${RED}×${NC} ${pattern}: ${exclude_count[$pattern]} 个文件被排除"
        done
        echo
    fi
}

# 计算百分比
calculate_percentage() {
    local part=$1
    local total=$2
    if [[ $total -eq 0 ]]; then
        echo "0.0"
    else
        echo "$(echo "scale=1; $part * 100 / $total" | bc)"
    fi
}

# 主函数
main() {
    local target_dir="${1:-.}"
    
    echo -e "${GREEN}开始统计代码行数...${NC}"
    echo -e "目标目录: ${BLUE}$(realpath "$target_dir")${NC}"
    echo -e "输出文件: ${YELLOW}$OUTPUT_FILE${NC}"
    echo -e "排除的文件夹: ${RED}${EXCLUDE_DIRS[*]}${NC}"
    echo
    
    # 检查目录是否存在
    if [[ ! -d "$target_dir" ]]; then
        echo -e "${RED}错误: 目录 '$target_dir' 不存在${NC}"
        exit 1
    fi
    
    # 处理目录
    process_directory "$target_dir"
    
    # 显示排除统计
    show_excluded_stats
    
    if [[ ${#processed_files[@]} -eq 0 ]]; then
        echo -e "${RED}没有找到可统计的文件！${NC}"
        exit 0
    fi
    
    # 计算总行数
    local total_lines=0
    for lines in "${language_stats[@]}"; do
        total_lines=$((total_lines + lines))
    done
    
    # 输出到命令行
    echo -e "${PURPLE}=== 语言统计 (${#processed_files[@]} 个文件) ===${NC}"
    for lang in "${!language_stats[@]}"; do
        local lines=${language_stats[$lang]}
        local percentage=$(calculate_percentage $lines $total_lines)
        printf "${CYAN}%-20s${NC}: ${GREEN}%6d${NC} 行 (%.1f%%)\n" "$lang" "$lines" "$percentage"
    done | sort
    
    echo
    echo -e "${PURPLE}=== 文件详细信息 ===${NC}"
    for lang in "${!language_stats[@]}"; do
        echo -e "${YELLOW}$lang${NC}：「${language_stats[$lang]}」"
        
        # 按文件路径排序输出
        IFS=$'\n' read -d '' -ra files <<< "${file_stats[$lang]}"
        IFS=$'\n' sorted_files=($(sort <<<"${files[*]}"))
        
        for file_info in "${sorted_files[@]}"; do
            if [[ -n "$file_info" ]]; then
                IFS=':' read -r file lines <<< "$file_info"
                printf "  |  ${BLUE}%-40s${NC}：「${GREEN}%4d${NC}」\n" "$file" "$lines"
            fi
        done
        echo
    done
    
    # 保存详细数据到文件
    save_to_file
    
    echo -e "${GREEN}统计完成！${NC}"
    echo -e "${GREEN}处理文件数: ${YELLOW}${#processed_files[@]}${NC}"
    echo -e "${GREEN}排除文件数: ${RED}${#excluded_files[@]}${NC}"
    echo -e "${GREEN}总代码行数: ${BLUE}$total_lines${NC}"
    echo -e "${GREEN}详细数据已保存到: ${YELLOW}$OUTPUT_FILE${NC}"
}

# 保存数据到文件 - 改进的输出格式
save_to_file() {
    {
        echo "# 代码行数统计报告"
        echo "# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "# 目标目录: $(realpath .)"
        echo "# 处理文件数: ${#processed_files[@]}"
        echo "# 排除文件数: ${#excluded_files[@]}"
        echo "# 总代码行数: $total_lines"
        echo "# 排除的文件夹: ${EXCLUDE_DIRS[*]}"
        echo ""
        
        # 语言统计表格（格式化为类似示例的简洁格式）
        echo "=== 语言统计 ==="
        for lang in $(printf '%s\n' "${!language_stats[@]}" | sort); do
            local lines=${language_stats[$lang]}
            local percentage=$(calculate_percentage $lines $total_lines)
            printf "%-20s:%-5d:%.1f%%\n" "$lang" "$lines" "$percentage"
        done
        
        echo ""
        
        # 排除统计（如果有的话）
        if [[ ${#excluded_files[@]} -gt 0 ]]; then
            echo "=== 排除统计 ==="
            declare -A exclude_count
            for file in "${excluded_files[@]}"; do
                for pattern in "${EXCLUDE_DIRS[@]}"; do
                    if [[ "$file" == *"/$pattern"* ]] || [[ "$file" == "$pattern"* ]]; then
                        exclude_count["$pattern"]=$((exclude_count["$pattern"] + 1))
                        break
                    fi
                done
            done
            
            for pattern in "${!exclude_count[@]}"; do
                echo "$pattern: ${exclude_count[$pattern]} 文件"
            done
            echo ""
        fi
        
        # 文件详细统计
        echo "=== 文件详细信息 ==="
        for lang in $(printf '%s\n' "${!language_stats[@]}" | sort); do
            echo "$lang:「${language_stats[$lang]}」"
            
            IFS=$'\n' read -d '' -ra files <<< "${file_stats[$lang]}"
            IFS=$'\n' sorted_files=($(sort <<<"${files[*]}"))
            
            for file_info in "${sorted_files[@]}"; do
                if [[ -n "$file_info" ]]; then
                    IFS=':' read -r file lines <<< "$file_info"
                    echo "  |  $file:「$lines」"
                fi
            done
            echo
        done
        
        # 额外信息：按文件类型分组统计
        echo "=== 文件类型统计 ==="
        declare -A file_types_count
        declare -A file_types_lines
        for info in "${processed_files[@]}"; do
            IFS=':' read -r file lang lines <<< "$info"
            file_types_count["$lang"]=$((file_types_count["$lang"] + 1))
            file_types_lines["$lang"]=$((file_types_lines["$lang"] + lines))
        done
        
        for lang in $(printf '%s\n' "${!file_types_count[@]}" | sort); do
            echo "$lang: ${file_types_count[$lang]} 文件, ${file_types_lines[$lang]} 行"
        done
        
    } > "$OUTPUT_FILE"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [目录路径]"
    echo "默认统计当前目录"
    echo ""
    echo "功能:"
    echo "  统计指定目录下的代码行数，排除空行和只有空格的行"
    echo "  自动排除 node_modules 等依赖文件夹"
    echo "  结果保存到 .data.<时间戳> 文件"
    echo ""
    echo "语言分类:"
    echo "  支持 30+ 种编程语言和配置文件类型"
    echo ""
    echo "排除的文件夹:"
    printf "  %s\n" "${EXCLUDE_DIRS[@]}"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -v, --version  显示版本信息"
}

# 显示版本信息
show_version() {
    echo "代码行数统计工具 v2.1"
    echo "支持精确的语言分类和排除策略"
}

# 参数处理
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -v|--version)
        show_version
        exit 0
        ;;
    --add-exclude)
        shift
        if [[ -n "$1" ]]; then
            EXCLUDE_DIRS+=("$1")
            echo "添加排除模式: $1"
        fi
        ;;
    *)
        main "$@"
        ;;
esac