import Link from "next/link";
import {productionCampaignService} from "@/lib/server/campaign-runtime";
import styles from "@/components/campaign/CampaignDashboard.module.css";

export const dynamic="force-dynamic";

export default async function CampaignsPage(){
  const campaigns=await productionCampaignService.list().catch(()=>[]);
  return <main className={styles.page}><div className={styles.shell}>
    <nav className={styles.nav}><Link href="/">← Video OS Studio</Link><span className={styles.eyebrow}>V2.4 Production</span></nav>
    <header className={styles.header}><div><div className={styles.eyebrow}>Campaign / Batch Production</div><h1>Production Dashboard</h1><div className={styles.muted}>Durable batch state across isolated Missions and Projects.</div></div></header>
    {campaigns.length?<div className={styles.list}>{campaigns.map(campaign=><Link className={styles.listLink} href={`/campaigns/${campaign.id}`} key={campaign.id}><strong>{campaign.title}</strong><span className={styles.status} data-status={campaign.status}>{campaign.status}</span><span>{campaign.missions.length} Missions</span><span>Concurrency {campaign.maxConcurrency}</span><span className={styles.muted}>{new Date(campaign.updatedAt).toLocaleString()}</span></Link>)}</div>:<div className={styles.empty}>No Campaigns yet. Create one through the bounded Campaign API from existing Production Missions.</div>}
  </div></main>;
}
