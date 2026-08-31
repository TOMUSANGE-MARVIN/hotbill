<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Seeds a set of SEO-friendly starter blog posts written in simple English for
 * the Ugandan WiFi hotspot / ISP audience. Idempotent: keyed by slug, so running
 * it again updates the same posts instead of creating duplicates. Existing
 * hand-written posts are left untouched.
 */
class BlogPostSeeder extends Seeder
{
    public function run(): void
    {
        $author = 'HotBill Team';
        // Publish dates, newest first - the newest becomes the featured post.
        $base = Carbon::create(2026, 6, 30, 9, 0, 0);

        foreach ($this->posts() as $i => $post) {
            $content = trim($post['content']);

            BlogPost::updateOrCreate(
                ['slug' => $post['slug']],
                [
                    'title' => $post['title'],
                    'category' => $post['category'],
                    'excerpt' => $post['excerpt'],
                    'content' => $content,
                    'status' => 'published',
                    'published_at' => $base->copy()->subDays($i * 3),
                    'author_name' => $author,
                    'reading_time' => BlogPost::estimateReadingTime($content),
                    'meta_title' => $post['meta_title'],
                    'meta_description' => $post['meta_description'],
                ]
            );
        }
    }

    private function posts(): array
    {
        return [
            [
                'title' => 'How to Start a WiFi Hotspot Business in Uganda',
                'slug' => 'how-to-start-wifi-hotspot-business-uganda',
                'category' => 'Guides',
                'excerpt' => 'A simple, step-by-step guide to starting a WiFi hotspot business in Uganda - from buying internet to getting paid with mobile money.',
                'meta_title' => 'How to Start a WiFi Hotspot Business in Uganda (2026 Guide)',
                'meta_description' => 'Learn how to start a WiFi hotspot business in Uganda step by step: pick a location, buy internet, set up a MikroTik router, and get paid with MTN MoMo and Airtel Money.',
                'content' => <<<'HTML'
<p>Selling WiFi is one of the easiest businesses to start in Uganda today. Many people have phones but no cheap way to get online. If you give them fast, affordable internet, they will pay you every day. This guide shows you how to start, step by step, in simple words.</p>

<h2>1. Pick a good location</h2>
<p>Your hotspot works best where many people gather and stay for a while. Good spots include:</p>
<ul>
<li>Trading centres and markets</li>
<li>Hostels and schools</li>
<li>Bars, restaurants and lodges</li>
<li>Bus and taxi parks</li>
</ul>
<p>Choose a place where people have some money to spend and where there is power most of the time.</p>

<h2>2. Buy an internet connection</h2>
<p>You need one strong internet line to share with your customers. You can use a fibre connection from a local ISP, or a 4G router if fibre is not available in your area. Start with a package that matches how many people you expect. You can always upgrade later as you grow.</p>

<h2>3. Get a MikroTik router</h2>
<p>A <strong>MikroTik router</strong> is the heart of a hotspot business. It shares your internet, controls how many people connect, and shows each user a login page. MikroTik routers are strong, affordable, and used by most hotspot owners in Uganda.</p>

<h2>4. Set up a captive portal</h2>
<p>A captive portal is the page a customer sees when they connect to your WiFi. It asks them to buy a package before they can browse. This is how you turn free WiFi into a paying business. With HotBill, you get a clean captive portal that works out of the box.</p>

<h2>5. Accept mobile money payments</h2>
<p>In Uganda, almost everyone pays with <strong>MTN MoMo</strong> or <strong>Airtel Money</strong>. Your hotspot should accept both. When a customer buys a package, the money should come straight to you and the internet should turn on automatically. No airtime, no waiting.</p>

<h2>6. Create your packages</h2>
<p>Give people simple choices. For example:</p>
<ul>
<li>1 hour for a small price</li>
<li>1 day for a bit more</li>
<li>1 week or 1 month for regular users</li>
</ul>
<p>Keep prices fair for your area. Cheap short packages bring in many first-time users, while weekly and monthly plans bring steady income.</p>

<h2>7. Tell people about it</h2>
<p>Put up a small poster with your WiFi name and prices. Tell shop owners nearby. Ask happy customers to bring their friends. Word of mouth is powerful in a trading centre.</p>

<h2>Start small and grow</h2>
<p>You do not need a lot of money to begin. Start with one router in one location, learn how it works, and add more routers as you earn. Many big hotspot businesses in Uganda started with just one small setup.</p>

<p>HotBill brings all of this together - router management, captive portal, mobile money, and daily reports - in one simple dashboard, so you can focus on growing your business.</p>
HTML,
            ],
            [
                'title' => 'MikroTik Hotspot Setup: A Simple Step-by-Step Guide',
                'slug' => 'mikrotik-hotspot-setup-guide',
                'category' => 'MikroTik',
                'excerpt' => 'New to MikroTik? This easy guide explains how a MikroTik hotspot works and how to set one up for your WiFi business.',
                'meta_title' => 'MikroTik Hotspot Setup: Simple Step-by-Step Guide',
                'meta_description' => 'A beginner-friendly guide to setting up a MikroTik hotspot for your WiFi business: what you need, how it works, and how to connect it to billing and mobile money.',
                'content' => <<<'HTML'
<p>MikroTik routers power most WiFi hotspots in Uganda. They are strong, affordable, and can handle many users at once. But for a beginner, setting one up can feel hard. This guide explains it in simple steps.</p>

<h2>What you need before you start</h2>
<ul>
<li>A MikroTik router (for example an hAP or an RB series board)</li>
<li>An internet line - fibre or 4G</li>
<li>A laptop or phone to set it up</li>
<li>A billing system like HotBill to sell packages</li>
</ul>

<h2>How a MikroTik hotspot works</h2>
<p>When someone connects to your WiFi, the MikroTik router stops them from browsing until they log in or pay. This is called a <strong>hotspot</strong>. The router shows a login page, checks if the user has paid, and then opens the internet for the time they bought. When their time ends, it cuts them off automatically.</p>

<h2>Step 1: Connect the router</h2>
<p>Plug your internet line into the router's WAN port (usually port 1). Connect your laptop to another port or to the router's WiFi. This lets you reach the router's settings.</p>

<h2>Step 2: Open the router settings</h2>
<p>You can manage a MikroTik router using a free tool called <strong>WinBox</strong>, or through its web page. Log in with the router's address and password. From here you can change settings and add a hotspot.</p>

<h2>Step 3: Turn on the hotspot</h2>
<p>MikroTik has a hotspot setup wizard. It creates the login page, sets up the network, and prepares the router to control users. You choose which network the hotspot runs on and confirm a few settings.</p>

<h2>Step 4: Connect it to your billing system</h2>
<p>This is the most important step for a business. On its own, MikroTik can only give free or manual logins. To sell packages and take mobile money, you connect it to a billing platform. HotBill talks to your MikroTik router for you, so packages, logins, and payments all work together.</p>

<h2>Step 5: Test it</h2>
<p>Connect with your phone. You should see the login page. Buy a small package to make sure the payment works and the internet turns on. Then let the time run out to check that it cuts off correctly.</p>

<h2>Make setup easier</h2>
<p>Setting up a MikroTik router by hand takes time and knowledge. With HotBill, you run one setup wizard and it prepares your router for you - no deep networking skills needed. That means you can start selling WiFi faster and spend less time on technical work.</p>
HTML,
            ],
            [
                'title' => 'How to Accept MTN MoMo and Airtel Money for Your WiFi',
                'slug' => 'accept-mtn-momo-airtel-money-wifi',
                'category' => 'Payments',
                'excerpt' => 'Mobile money is how Uganda pays. Here is how to accept MTN MoMo and Airtel Money for your hotspot so customers get online instantly.',
                'meta_title' => 'Accept MTN MoMo & Airtel Money for Your WiFi Hotspot',
                'meta_description' => 'Learn how to accept MTN Mobile Money and Airtel Money for your WiFi hotspot in Uganda, so customers pay and get online automatically without airtime or manual work.',
                'content' => <<<'HTML'
<p>In Uganda, mobile money is king. Most people do not carry cash or use bank cards, but almost everyone has <strong>MTN MoMo</strong> or <strong>Airtel Money</strong>. If your WiFi business accepts mobile money, you make it easy for people to pay - and easy payment means more sales.</p>

<h2>Why mobile money beats cash and airtime</h2>
<ul>
<li><strong>It is fast.</strong> A customer pays and gets online in seconds.</li>
<li><strong>It is safe.</strong> You do not keep piles of cash at your hotspot.</li>
<li><strong>It works day and night.</strong> Customers can pay even when you are not there.</li>
<li><strong>It keeps records.</strong> Every payment is tracked, so you always know your earnings.</li>
</ul>

<h2>How mobile money payments should work</h2>
<p>A good hotspot payment flow is simple. The customer:</p>
<ul>
<li>Connects to your WiFi and sees the login page</li>
<li>Picks a package and enters their phone number</li>
<li>Gets a payment prompt on their phone (MTN or Airtel)</li>
<li>Enters their PIN to approve</li>
<li>Gets online automatically once the payment is confirmed</li>
</ul>
<p>The customer should never have to send you airtime, call you, or wait for you to turn on their internet by hand. Everything should happen on its own.</p>

<h2>Collecting the money the right way</h2>
<p>When a customer pays, the money should go straight to your mobile money account. A strong billing system checks that the payment really went through before it turns on the internet. This protects you from people who claim to have paid when they have not.</p>

<h2>Getting your earnings out</h2>
<p>As customers pay, your earnings build up. You should be able to withdraw your money to your own mobile money number whenever you want. With HotBill, payouts go automatically to your Airtel or MTN line, so your earnings reach you without stress.</p>

<h2>One system for both networks</h2>
<p>Some customers use MTN and others use Airtel. Your hotspot should accept both without extra work. HotBill supports MTN MoMo and Airtel Money together, so no customer is ever turned away because of their network.</p>

<p>When paying is easy, people buy more often. Accepting mobile money the smart way is one of the best things you can do to grow your WiFi business in Uganda.</p>
HTML,
            ],
            [
                'title' => 'WiFi Vouchers Explained: How to Sell Internet by Voucher',
                'slug' => 'wifi-vouchers-explained',
                'category' => 'Guides',
                'excerpt' => 'WiFi vouchers let you sell internet as printed codes. Learn what they are, why they work, and how to use them to grow your hotspot.',
                'meta_title' => 'WiFi Vouchers Explained: How to Sell Internet by Voucher',
                'meta_description' => 'Learn what WiFi vouchers are and how to sell internet by voucher code. A simple guide for hotspot owners in Uganda who want more ways to get paid.',
                'content' => <<<'HTML'
<p>A <strong>WiFi voucher</strong> is a code that gives someone internet for a set time. The customer buys the code, enters it on your login page, and gets online. Vouchers are a simple and powerful way to sell WiFi, especially where mobile money is not always easy.</p>

<h2>What is a WiFi voucher?</h2>
<p>Think of a voucher like a scratch card for airtime. Each voucher has a unique code and a value - for example "1 day" or "1 week" of internet. Once a code is used, it cannot be used again. This keeps your business safe from cheating.</p>

<h2>Why vouchers are useful</h2>
<ul>
<li><strong>Sell through agents.</strong> Shop owners near your hotspot can sell your vouchers and earn a small cut. This spreads your business without extra work from you.</li>
<li><strong>Good for gifts and groups.</strong> A parent can buy a voucher for a child, or a business can hand vouchers to guests.</li>
<li><strong>Works offline.</strong> A customer can buy a printed voucher with cash even if their mobile money is low.</li>
<li><strong>Easy to understand.</strong> Everyone knows how to scratch and enter a code.</li>
</ul>

<h2>How selling by voucher works</h2>
<p>The steps are simple:</p>
<ul>
<li>You create a batch of vouchers in your billing system, each with a value.</li>
<li>You print them or share the codes with your agents.</li>
<li>A customer buys a voucher and connects to your WiFi.</li>
<li>They enter the code on the login page and get online for the time they paid for.</li>
</ul>

<h2>Vouchers and mobile money together</h2>
<p>You do not have to choose one or the other. The best hotspots offer both: instant mobile money payments for people who want to pay online, and vouchers for people who prefer cash or buy from a shop. Offering both means you never lose a sale.</p>

<h2>Keep track of every voucher</h2>
<p>A good system shows you which vouchers are used, which are still active, and how much money each batch brought in. This helps you manage agents and see what is selling. HotBill lets you create, print, and track vouchers easily, right next to your other sales.</p>

<p>Vouchers turn your WiFi into something people can buy anywhere, any time - even from the shop next door. That is a simple way to reach more customers and earn more.</p>
HTML,
            ],
            [
                'title' => 'How Much Can You Earn From a WiFi Hotspot in Uganda?',
                'slug' => 'how-much-can-you-earn-wifi-hotspot-uganda',
                'category' => 'Business',
                'excerpt' => 'Thinking of starting a hotspot? Here is a simple, honest look at how WiFi hotspot income works and what affects your earnings.',
                'meta_title' => 'How Much Can You Earn From a WiFi Hotspot in Uganda?',
                'meta_description' => 'A simple, honest guide to WiFi hotspot income in Uganda: how earnings work, what costs to expect, and how to make your hotspot more profitable.',
                'content' => <<<'HTML'
<p>One of the first questions people ask is: "Can a WiFi hotspot really make money?" The honest answer is yes - but how much depends on a few things. This guide explains, in simple terms, how hotspot income works and how to grow it.</p>

<h2>How hotspot income works</h2>
<p>Your income comes from customers buying packages. If many people buy small packages every day, those small amounts add up fast. A busy hotspot in a good location can serve dozens or even hundreds of users a day.</p>
<p>Your <strong>profit</strong> is what is left after you pay for your internet line, power, and any small costs. The goal is simple: earn more from packages than you spend on running the hotspot.</p>

<h2>What affects your earnings</h2>
<ul>
<li><strong>Location.</strong> More people nearby means more customers. A busy trading centre earns more than a quiet street.</li>
<li><strong>Internet quality.</strong> Fast, reliable WiFi keeps customers coming back. Slow WiFi drives them away.</li>
<li><strong>Your prices.</strong> Fair prices bring more buyers. Set prices your area can afford.</li>
<li><strong>Uptime.</strong> If your WiFi is often off, you lose sales. Reliable power and internet matter a lot.</li>
<li><strong>Number of routers.</strong> More locations mean more income. Many owners grow by adding routers one by one.</li>
</ul>

<h2>Costs to plan for</h2>
<p>Before you count profit, remember your costs:</p>
<ul>
<li>Your monthly internet package</li>
<li>Power or fuel for backup</li>
<li>The router and setup (a one-time cost)</li>
<li>Small fees for collecting mobile money</li>
</ul>
<p>Keep these low and steady, and more of your sales become profit.</p>

<h2>How to earn more</h2>
<ul>
<li><strong>Offer weekly and monthly plans.</strong> Regular customers bring steady income.</li>
<li><strong>Use vouchers and agents.</strong> Let nearby shops sell for you.</li>
<li><strong>Keep the WiFi fast and always on.</strong> Reliability builds trust and repeat sales.</li>
<li><strong>Watch your reports.</strong> Know your best-selling packages and your busiest hours.</li>
</ul>

<h2>Know your numbers</h2>
<p>The owners who earn the most are the ones who track their business. When you can see your daily sales, your best packages, and your growth over time, you can make smart choices. HotBill gives you a clear dashboard so you always know how your hotspot is doing.</p>

<p>A WiFi hotspot will not make you rich overnight, but with a good location, reliable internet, and steady management, it can become a solid, growing source of income.</p>
HTML,
            ],
            [
                'title' => '7 Easy Ways to Get More Hotspot Customers',
                'slug' => 'get-more-hotspot-customers',
                'category' => 'Growth',
                'excerpt' => 'Want more people using your WiFi? These seven simple, low-cost tips will help you attract and keep more hotspot customers.',
                'meta_title' => '7 Easy Ways to Get More WiFi Hotspot Customers',
                'meta_description' => 'Seven simple, low-cost ways to get more customers for your WiFi hotspot in Uganda - from better pricing to reliable internet and word of mouth.',
                'content' => <<<'HTML'
<p>Getting your hotspot running is only the first step. To grow, you need people to use it again and again - and to tell their friends. Here are seven easy ways to get more customers, without spending a lot of money.</p>

<h2>1. Keep your WiFi fast and reliable</h2>
<p>Nothing loses customers faster than slow or broken internet. When your WiFi is fast and always on, people come back and trust you. This is the number one thing that grows a hotspot business.</p>

<h2>2. Price for your area</h2>
<p>Look at what people around you can afford. Cheap, short packages bring in first-time users. Once they trust your WiFi, many will buy bigger packages. Fair prices beat high prices that scare people away.</p>

<h2>3. Make a clear poster</h2>
<p>Put up a simple, bright poster showing your WiFi name and package prices. People cannot buy what they do not know about. A good sign at eye level in a busy spot brings walk-in customers every day.</p>

<h2>4. Offer both mobile money and vouchers</h2>
<p>Some people want to pay instantly with MTN MoMo or Airtel Money. Others prefer buying a printed voucher with cash. Offer both so no one is turned away because of how they like to pay.</p>

<h2>5. Use nearby shops as agents</h2>
<p>Ask shop owners near you to sell your vouchers for a small share. They earn a little, and they send customers to your WiFi. This grows your reach without you doing all the work.</p>

<h2>6. Reward loyal customers</h2>
<p>Give regular users a reason to stay. A small bonus, a slightly better weekly plan, or a friendly attitude goes a long way. Happy customers bring their friends and family.</p>

<h2>7. Watch what sells</h2>
<p>Check your reports to see which packages and which hours are busiest. Then focus on what works. If daily plans sell best in the evening, make sure your WiFi is strong at that time. Smart owners make choices based on real numbers, not guesses.</p>

<h2>Small steps, steady growth</h2>
<p>You do not need a big budget to grow a hotspot. Reliable internet, fair prices, easy payment, and a little marketing will steadily bring more customers. HotBill helps you manage all of this - packages, payments, vouchers, and reports - from one simple dashboard, so you can focus on growing.</p>
HTML,
            ],
        ];
    }
}
