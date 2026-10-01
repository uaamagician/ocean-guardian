const TOPICS = [
  {
    title: "海水溫度",
    body: "台灣周邊海域的即時海溫，以及和往年同期相比偏高多少。",
    source: "NOAA Coral Reef Watch",
  },
  {
    title: "珊瑚白化預警",
    body: "海溫持續偏高時珊瑚容易白化，這裡會標出目前有白化風險的海域。",
    source: "NOAA Coral Reef Watch、Allen Coral Atlas",
  },
  {
    title: "全球暖化",
    body: "海洋吸收了大部分的暖化熱量，用幾張圖看懂暖化和海洋的關係。",
    source: "NOAA、NASA",
  },
  {
    title: "減塑與海洋保育",
    body: "海洋垃圾大多來自陸地。從日常生活可以做的減塑行動開始。",
    source: null,
  },
];

export default function InfoPage() {
  return (
    <div className="page">
      <div className="section">
        <h1>海洋資訊</h1>
        <p className="page-intro">來自科學機構的海洋數據，幫你看懂海灘上的垃圾和遠方的海發生了什麼事。</p>
      </div>

      {TOPICS.map((topic) => (
        <section key={topic.title} className="notice">
          <h2>{topic.title}</h2>
          <p>{topic.body}</p>
          <p className="report-meta">{topic.source ? `資料來源：${topic.source}（串接中）` : "內容整理中"}</p>
        </section>
      ))}
    </div>
  );
}
