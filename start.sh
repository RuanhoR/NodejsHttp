echo -e "\n按 CTRL+C 退出"
while true; do
  node index.js
  if [ -f "lib/data/exit.log" ];then
    file="$(tr -d '\n\r' < lib/data/exit.log)";
    case $file in
      "1")
        echo ""
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
        ;;
esac
  fi
done