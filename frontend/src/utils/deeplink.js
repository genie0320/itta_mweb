export const launchExternalMap = (mapType, dest) => {
	const { lat, lng, name } = dest;
	const encodedName = encodeURIComponent(name);

	if (mapType === "naver") {
		const appUrl = `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${encodedName}&appname=TinySherpa`;
		const webUrl = `https://m.map.naver.com/route.naver?dlat=${lat}&dlng=${lng}&dname=${encodedName}`;

		window.location.href = appUrl;
		setTimeout(() => {
			window.location.href = webUrl;
		}, 1500);
	}

	if (mapType === "kakao") {
		// 카카오맵 스케줄러 실행 스킴 (대중교통 안내 타깃)
		window.location.href = `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`;
	}
};
