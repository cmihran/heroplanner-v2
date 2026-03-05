for i in $(find ./ -type f -name '44px*.png'); do
	myString="${i:7}"
	mv $i $myString
done
