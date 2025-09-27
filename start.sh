install() {
  if command -v pkg;then
    pkg uninstall "$1" # 卸载避免包残缺
    pkg install "$1"
    return 2
  fi
  if command -v apt;then
    apt remove "$1"
    apt install "$1"
    return 2
  fi
  if command -v winget;then
    winget uninstall "$1"
    winget install "$1"
    return 2
  fi
  echo "请去 nodejs.org 下载安装 nodejs \n 或自行下载nodejs"
  exit 1
}
if command -v node && command -v npm;then
  echo "nodejs is installed";
else 
  install nodejs
fi
if  [ -f "node_modules/nodemailer/package.json" ];then 
  echo "Dependency nodemailer is installed"
else 
  npm install
fi
if  [ -f "node_modules/mime-types/package.json" ];then 
  echo "Dependency mime-types is installed"
else 
  npm install
fi
echo -e "\n按 CTRL+C 退出"
while true; do
  node index.js
  if [ -f "lib/data/exit.log" ];then
    file="$(tr -d '\n\r' < lib/data/exit.log)";
    rm -rf lib/data/exit.log
    case $file in
      "1")
        echo "运行时未知原因退出"
        ;;
      "2")
        echo "因错误退出！"
        ;;
      "3")
        echo "已退出"
        break
        ;;
      "4")
        echo "已重启"
    esac
  fi
done